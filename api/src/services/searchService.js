/**
 * Azure AI Search — powers the RAG retrieval step for the AI Chat feature
 * and the global search bar.
 *
 * Every record is chunked (see utils/chunker.js) and each chunk is uploaded
 * as one search document. Semantic ranking (semantic configuration
 * "carepilot-semantic-config") is used so retrieval quality is good even
 * without a separate vector-embedding deployment.
 *
 * Docs: https://learn.microsoft.com/azure/search/search-get-started-rest
 */
const axios = require('axios');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

function assertConfigured() {
  if (!env.search.isConfigured) {
    throw new AppError(
      'Azure AI Search is not configured. Set AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_KEY and ' +
        'AZURE_SEARCH_INDEX in backend/.env',
      500
    );
  }
}

function client() {
  return axios.create({
    baseURL: env.search.endpoint,
    headers: {
      'api-key': env.search.key,
      'Content-Type': 'application/json',
    },
  });
}

const INDEX_SCHEMA = () => ({
  name: env.search.index,
  fields: [
    { name: 'id', type: 'Edm.String', key: true, searchable: false, filterable: true },
    { name: 'recordId', type: 'Edm.String', filterable: true, searchable: false },
    { name: 'userId', type: 'Edm.String', filterable: true, searchable: false },
    { name: 'docType', type: 'Edm.String', filterable: true, facetable: true, searchable: true },
    { name: 'title', type: 'Edm.String', searchable: true },
    { name: 'content', type: 'Edm.String', searchable: true },
    { name: 'date', type: 'Edm.String', filterable: true, sortable: true, searchable: false },
    { name: 'chunkIndex', type: 'Edm.Int32', filterable: false, searchable: false },
  ],
  semantic: {
    configurations: [
      {
        name: 'carepilot-semantic-config',
        prioritizedFields: {
          titleField: { fieldName: 'title' },
          prioritizedContentFields: [{ fieldName: 'content' }],
          prioritizedKeywordsFields: [{ fieldName: 'docType' }],
        },
      },
    ],
  },
});

/**
 * Creates the index if it doesn't already exist. Safe to call on every boot.
 */
async function ensureIndex() {
  if (!env.search.isConfigured) {
    logger.warn('[searchService] Skipping index setup — Azure AI Search not configured.');
    return false;
  }
  const http = client();
  try {
    await http.get(`/indexes/${env.search.index}?api-version=${env.search.apiVersion}`);
    logger.info(`[searchService] Index "${env.search.index}" already exists.`);
    return true;
  } catch (err) {
    if (err.response?.status !== 404) {
      logger.error('[searchService] Failed checking index existence:', err.message);
      return false;
    }
  }

  try {
    await http.post(`/indexes?api-version=${env.search.apiVersion}`, INDEX_SCHEMA());
    logger.info(`[searchService] Created index "${env.search.index}".`);
    return true;
  } catch (err) {
    logger.error(
      '[searchService] Failed to create index:',
      err.response?.data ? JSON.stringify(err.response.data) : err.message
    );
    return false;
  }
}

/**
 * Uploads (merge-or-upload) one or more chunk documents for a record.
 */
async function indexChunks(recordId, userId, docType, title, date, chunks) {
  assertConfigured();
  const http = client();

  const docs = chunks.map((content, i) => ({
    '@search.action': 'mergeOrUpload',
    id: `${recordId}-${i}`,
    recordId,
    userId,
    docType,
    title,
    content,
    date,
    chunkIndex: i,
  }));

  if (!docs.length) return;

  await http.post(`/indexes/${env.search.index}/docs/index?api-version=${env.search.apiVersion}`, {
    value: docs,
  });
}

/**
 * Deletes all chunks belonging to a record (called when a record is deleted).
 */
async function deleteRecordChunks(recordId, approxChunkCount = 20) {
  assertConfigured();
  const http = client();
  const docs = Array.from({ length: approxChunkCount }, (_, i) => ({
    '@search.action': 'delete',
    id: `${recordId}-${i}`,
  }));
  try {
    await http.post(
      `/indexes/${env.search.index}/docs/index?api-version=${env.search.apiVersion}`,
      { value: docs }
    );
  } catch (err) {
    logger.warn('[searchService] Non-fatal error deleting record chunks:', err.message);
  }
}

/**
 * Semantic + keyword search used both by the RAG chat (to retrieve context)
 * and the global search bar.
 */
async function search(query, { userId, top = 6, filter } = {}) {
  assertConfigured();
  const http = client();

  const filters = [];
  if (userId) filters.push(`userId eq '${userId.replace(/'/g, "''")}'`);
  if (filter) filters.push(filter);

  const body = {
    search: query,
    top,
    queryType: 'semantic',
    semanticConfiguration: 'carepilot-semantic-config',
    captions: 'extractive',
    ...(filters.length ? { filter: filters.join(' and ') } : {}),
  };

  try {
    const resp = await http.post(
      `/indexes/${env.search.index}/docs/search?api-version=${env.search.apiVersion}`,
      body
    );
    return resp.data.value || [];
  } catch (err) {
    // Semantic search requires a specific pricing tier; gracefully fall back
    // to plain full-text search so the app still works on Free/Basic tiers.
    logger.warn('[searchService] Semantic query failed, falling back to simple search:', err.message);
    const resp = await http.post(
      `/indexes/${env.search.index}/docs/search?api-version=${env.search.apiVersion}`,
      { search: query, top, queryType: 'simple', ...(filters.length ? { filter: filters.join(' and ') } : {}) }
    );
    return resp.data.value || [];
  }
}

module.exports = { ensureIndex, indexChunks, deleteRecordChunks, search };

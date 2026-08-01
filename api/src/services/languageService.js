/**
 * Azure AI Language.
 *   - Text Analytics for Health: extracts clinical entities (medication name,
 *     dosage, frequency, route, test name, date) directly from free text —
 *     this is the primary signal for medicine/test extraction.
 *   - Key Phrase Extraction: used to build good search/index metadata.
 *
 * Docs: https://learn.microsoft.com/azure/ai-services/language-service/text-analytics-for-health/overview
 */
const axios = require('axios');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

const API_VERSION = '2023-04-01';

function assertConfigured() {
  if (!env.language.isConfigured) {
    throw new AppError(
      'Azure AI Language is not configured. Set LANGUAGE_ENDPOINT and LANGUAGE_KEY in backend/.env',
      500
    );
  }
}

function client() {
  return axios.create({
    baseURL: env.language.endpoint,
    headers: {
      'Ocp-Apim-Subscription-Key': env.language.key,
      'Content-Type': 'application/json',
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Text Analytics for Health runs as an async job. Submit -> poll -> collect.
 */
async function analyzeHealth(text) {
  assertConfigured();
  const http = client();

  const submitResp = await http.post(
    `/language/analyze-text/jobs?api-version=${API_VERSION}`,
    {
      analysisInput: {
        documents: [{ id: '1', language: 'en', text: text.slice(0, 100000) }],
      },
      tasks: [{ kind: 'Healthcare', taskName: 'CarePilotHealthTask' }],
    }
  );

  const opLocation = submitResp.headers['operation-location'];
  if (!opLocation) {
    throw new AppError('Azure AI Language did not return an operation-location header.', 502);
  }

  let final;
  for (let attempt = 0; attempt < 20; attempt++) {
    await sleep(1000);
    const pollResp = await axios.get(opLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': env.language.key },
    });
    if (pollResp.data.status === 'succeeded') {
      final = pollResp.data;
      break;
    }
    if (pollResp.data.status === 'failed') {
      throw new AppError('Azure AI Language health analysis failed.', 502);
    }
  }

  if (!final) throw new AppError('Azure AI Language health analysis timed out.', 504);

  const doc = final.tasks?.items?.[0]?.results?.documents?.[0];
  const entities = (doc?.entities || []).map((e) => ({
    text: e.text,
    category: e.category,
    subCategory: e.subCategory || null,
    confidence: e.confidenceScore,
  }));

  return { entities };
}

/**
 * Standard (non-clinical) key phrase extraction — used to enrich search
 * index metadata and the global search feature.
 */
async function extractKeyPhrases(text) {
  assertConfigured();
  const http = client();

  const resp = await http.post(`/language/:analyze-text?api-version=${API_VERSION}`, {
    kind: 'KeyPhraseExtraction',
    analysisInput: {
      documents: [{ id: '1', language: 'en', text: text.slice(0, 5120) }],
    },
  });

  const doc = resp.data.results?.documents?.[0];
  return doc?.keyPhrases || [];
}

module.exports = { analyzeHealth, extractKeyPhrases };

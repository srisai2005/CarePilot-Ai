const { v4: uuid } = require('uuid');
const fs = require('fs');
const path = require('path');
const db = require('../data/db');
const visionService = require('./visionService');
const speechService = require('./speechService');
const extractionService = require('./extractionService');
const openaiService = require('./openaiService');
const searchService = require('./searchService');
const reminderService = require('./reminderService');
const { chunkText } = require('../utils/chunker');
const { simplifyPrompt } = require('../utils/promptTemplates');
const { isImage, isPdf, isAudio } = require('../utils/validators');
const { AppError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const { getLanguage, DEFAULT_LANGUAGE } = require('../config/languages');

const COLLECTION = 'records';
const DEFAULT_USER = 'default-user'; // single-tenant demo; swap for real auth in production

function docTypeFromUpload(file, declaredType) {
  if (declaredType) return declaredType;
  if (isAudio(file)) return 'Doctor Voice Note';
  if (isPdf(file)) return 'Document';
  if (isImage(file)) return 'Photo';
  return 'Document';
}

/**
 * Full upload pipeline:
 *  1. OCR (Vision) or transcription (Speech) -> raw text
 *  2. Structured extraction (Language + Azure OpenAI) -> medicines, doctors, tests, dates, summary
 *  3. Persist record
 *  4. Chunk + index into Azure AI Search for RAG chat
 *  5. Auto-create a follow-up reminder if one was detected
 */
async function processUpload(file, meta = {}) {
  const docType = docTypeFromUpload(file, meta.docType);
  const language = getLanguage(meta.language || DEFAULT_LANGUAGE);
  let rawText = '';
  let ocrMeta = null;

  if (isAudio(file)) {
    const { text, confidence } = await speechService.transcribeAudio(file.path, file.mimetype, language.sttLocale);
    rawText = text;
    ocrMeta = { source: 'speech-to-text', confidence };
  } else {
    const { text, pageCount, lineCount } = await visionService.runOcr(file.path);
    rawText = text;
    ocrMeta = { source: 'vision-ocr', pageCount, lineCount };
  }

  if (!rawText || !rawText.trim()) {
    throw new AppError(
      'No readable text/speech could be found in this file. Try a clearer photo or recording.',
      422
    );
  }

  const structured = await extractionService.extractStructuredData({
    docType,
    text: rawText,
    languageLabel: language.label,
  });

  const record = {
    id: uuid(),
    userId: DEFAULT_USER,
    fileName: meta.originalName || file.originalname,
    docType,
    language: language.code,
    uploadedAt: new Date().toISOString(),
    documentDate: structured.documentDateGuess || null,
    rawText,
    ocrMeta,
    ...structured,
    // summaryMarkdown already spread in from structured
  };

  await db.insert(COLLECTION, record);

  // Index for RAG chat / global search (best-effort — does not block the response).
  try {
    await searchService.ensureIndex();
    const chunks = chunkText(rawText);
    await searchService.indexChunks(
      record.id,
      record.userId,
      record.docType,
      record.fileName,
      record.documentDate || record.uploadedAt.slice(0, 10),
      chunks
    );
  } catch (err) {
    logger.warn('[recordService] Search indexing failed (record still saved):', err.message);
  }

  // Auto-create a reminder if a follow-up date was detected.
  if (record.followUp && record.followUp.date) {
    try {
      await reminderService.createReminder({
        recordId: record.id,
        title: `Follow-up: ${record.hospitalOrClinic || record.docType}`,
        date: record.followUp.date,
        notes: record.followUp.instructions || '',
      });
    } catch (err) {
      logger.warn('[recordService] Could not auto-create reminder:', err.message);
    }
  }

  return record;
}

async function listRecords(userId = DEFAULT_USER) {
  const all = await db.getAll(COLLECTION);
  return all
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

async function getRecord(id) {
  const record = await db.getById(COLLECTION, id);
  if (!record) throw new AppError('Record not found.', 404);
  return record;
}

async function deleteRecord(id) {
  const record = await db.getById(COLLECTION, id);
  if (!record) throw new AppError('Record not found.', 404);

  await db.remove(COLLECTION, id);

  try {
    await searchService.deleteRecordChunks(id);
  } catch (err) {
    logger.warn('[recordService] Non-fatal: failed to delete search chunks:', err.message);
  }

  // Best-effort cleanup of the stored upload file.
  try {
    const os = require('os');
    const uploadDir = path.join(os.tmpdir(), 'carepilot-uploads');
    const files = fs.readdirSync(uploadDir);
    // Files are stored with random names, not tied to record.id, so we leave
    // physical cleanup to a periodic job in a real deployment; nothing to do here.
    void files;
  } catch (_) {
    /* uploads dir may not exist yet — fine */
  }

  return true;
}

const MAX_SIMPLIFY_LEVELS = 3;

/**
 * Re-explains a record's summary in even simpler language, up to
 * MAX_SIMPLIFY_LEVELS times, so patients (or family members) who still find
 * it hard to follow can keep asking for something easier.
 */
async function simplifySummary(id) {
  const record = await db.getById(COLLECTION, id);
  if (!record) throw new AppError('Record not found.', 404);

  const levels = record.simplifiedSummaries || [];
  if (levels.length >= MAX_SIMPLIFY_LEVELS) {
    return { record, alreadyAtSimplest: true };
  }

  const currentText = levels.length ? levels[levels.length - 1] : record.summaryMarkdown;
  const language = getLanguage(record.language || DEFAULT_LANGUAGE);
  const { content } = await openaiService.chatComplete(
    simplifyPrompt({ text: currentText, level: levels.length + 1, languageLabel: language.label }),
    { temperature: 0.4, maxTokens: 350 }
  );

  const updated = await db.update(COLLECTION, id, {
    simplifiedSummaries: [...levels, content],
  });

  return { record: updated, alreadyAtSimplest: updated.simplifiedSummaries.length >= MAX_SIMPLIFY_LEVELS };
}

module.exports = {
  processUpload,
  listRecords,
  getRecord,
  deleteRecord,
  simplifySummary,
  DEFAULT_USER,
};

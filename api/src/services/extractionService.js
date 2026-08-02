/**
 * Combines Azure AI Vision / Speech (raw text) + Azure AI Language (Text
 * Analytics for Health, clinical entities) + Azure OpenAI (structured JSON
 * extraction + plain-language summary) into one clean record object.
 */
const languageService = require('./languageService');
const openaiService = require('./openaiService');
const { extractionPrompt, summarizePrompt } = require('../utils/promptTemplates');
const logger = require('../utils/logger');

const TIMING_WORDS = {
  morning: 'Morning',
  am: 'Morning',
  breakfast: 'Morning',
  afternoon: 'Afternoon',
  noon: 'Afternoon',
  lunch: 'Afternoon',
  evening: 'Night',
  night: 'Night',
  bedtime: 'Night',
  dinner: 'Night',
  pm: 'Night',
};

function guessTiming(frequencyText = '') {
  const lower = frequencyText.toLowerCase();
  for (const [word, slot] of Object.entries(TIMING_WORDS)) {
    if (lower.includes(word)) return slot;
  }
  if (/\b(od|once)\b/.test(lower)) return 'Morning';
  if (/\b(bd|bid|twice)\b/.test(lower)) return 'Multiple';
  if (/\b(tds|tid|three)\b/.test(lower)) return 'Multiple';
  return null;
}

/**
 * Runs Text Analytics for Health (best-effort — non-fatal if it fails, since
 * the OpenAI structured extraction below is the primary source of truth) and
 * Azure OpenAI structured JSON extraction + a plain-language summary.
 */
async function extractStructuredData({ docType, text, languageLabel = 'English' }) {
  let clinicalEntities = [];
  try {
    const health = await languageService.analyzeHealth(text);
    clinicalEntities = health.entities;
  } catch (err) {
    logger.warn('[extractionService] Text Analytics for Health skipped/failed:', err.message);
  }

  const structured = await openaiService.chatCompleteJson(extractionPrompt({ docType, extractedText: text }));

  // Fill in a timing slot for each medicine if the model didn't set one.
  const medicines = (structured.medicines || []).map((m) => ({
    name: m.name,
    dosage: m.dosage || null,
    frequency: m.frequency || null,
    duration: m.duration || null,
    timing: m.timing || guessTiming(m.frequency || '') || 'Multiple',
  }));

  const { content: summaryMarkdown } = await openaiService.chatComplete(
    summarizePrompt({ docType, extractedText: text, languageLabel }),
    { temperature: 0.4, maxTokens: 450 }
  );

  return {
    medicines,
    doctors: structured.doctors || [],
    hospitalOrClinic: structured.hospitalOrClinic || null,
    tests: structured.tests || [],
    dates: structured.dates || [],
    followUp: structured.followUp || null,
    documentDateGuess: structured.documentDateGuess || null,
    clinicalEntities,
    summaryMarkdown,
  };
}

module.exports = { extractStructuredData, guessTiming };

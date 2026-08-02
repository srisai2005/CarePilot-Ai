const { v4: uuid } = require('uuid');
const db = require('../data/db');
const searchService = require('./searchService');
const openaiService = require('./openaiService');
const { ragChatPrompt } = require('../utils/promptTemplates');
const { AppError } = require('../middleware/errorHandler');
const { getLanguage, DEFAULT_LANGUAGE } = require('../config/languages');

const COLLECTION = 'chats';

async function getHistory(userId = 'default-user') {
  const all = await db.getAll(COLLECTION);
  return all
    .filter((m) => m.userId === userId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

async function saveMessage(userId, role, content, sources = []) {
  const msg = {
    id: uuid(),
    userId,
    role,
    content,
    sources,
    createdAt: new Date().toISOString(),
  };
  await db.insert(COLLECTION, msg);
  return msg;
}

/**
 * Answers a patient question strictly from their own uploaded records:
 *  1. Retrieve top matching chunks from Azure AI Search (scoped to userId)
 *  2. Feed them + recent chat history into Azure OpenAI with a strict
 *     "answer only from these sources" system prompt
 *  3. Persist both the question and answer for the chat history UI
 */
async function askQuestion(userId, question, languageCode = DEFAULT_LANGUAGE) {
  if (!question || !question.trim()) {
    throw new AppError('Please type a question.', 400);
  }

  const language = getLanguage(languageCode);

  let snippets = [];
  try {
    const results = await searchService.search(question, { userId, top: 6 });
    snippets = results.map((r) => ({
      content: r.content,
      docType: r.docType,
      date: r.date,
      recordId: r.recordId,
      score: r['@search.score'],
    }));
  } catch (err) {
    // If Search isn't configured/reachable, we still answer, but transparently
    // say we found nothing (per the safety prompt), rather than hallucinating.
    snippets = [];
  }

  const history = await getHistory(userId);
  const messages = ragChatPrompt({
    question,
    contextSnippets: snippets,
    chatHistory: history,
    languageLabel: language.label,
  });

  const { content: answer } = await openaiService.chatComplete(messages, {
    temperature: 0.2,
    maxTokens: 500,
  });

  await saveMessage(userId, 'user', question);
  const saved = await saveMessage(userId, 'assistant', answer, snippets.map((s) => ({
    recordId: s.recordId,
    docType: s.docType,
    date: s.date,
  })));

  return { answer, sources: saved.sources, messageId: saved.id };
}

module.exports = { getHistory, askQuestion, saveMessage };

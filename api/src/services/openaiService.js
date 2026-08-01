/**
 * Azure OpenAI chat completions wrapper.
 * Docs: https://learn.microsoft.com/azure/ai-services/openai/reference
 */
const axios = require('axios');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

function assertConfigured() {
  if (!env.openai.isConfigured) {
    throw new AppError(
      'Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY and ' +
        'AZURE_OPENAI_DEPLOYMENT in backend/.env',
      500
    );
  }
}

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {{ temperature?: number, maxTokens?: number, jsonMode?: boolean }} opts
 */
async function chatComplete(messages, opts = {}) {
  assertConfigured();

  const { temperature = 0.3, maxTokens = 900, jsonMode = false } = opts;

  const url =
    `${env.openai.endpoint}/openai/deployments/${env.openai.deployment}/chat/completions` +
    `?api-version=${env.openai.apiVersion}`;

  const body = {
    messages,
    temperature,
    max_tokens: maxTokens,
    top_p: 0.95,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const resp = await axios.post(url, body, {
    headers: {
      'api-key': env.openai.key,
      'Content-Type': 'application/json',
    },
  });

  const choice = resp.data.choices?.[0];
  return {
    content: choice?.message?.content || '',
    finishReason: choice?.finish_reason,
    usage: resp.data.usage,
  };
}

/**
 * Convenience wrapper that expects (and safely parses) a JSON object back
 * from the model — used for structured extraction.
 */
async function chatCompleteJson(messages, opts = {}) {
  const { content } = await chatComplete(messages, { ...opts, jsonMode: true, temperature: 0 });
  const cleaned = content.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    throw new AppError('Azure OpenAI returned malformed JSON for structured extraction.', 502, {
      raw: content,
    });
  }
}

module.exports = { chatComplete, chatCompleteJson };

/**
 * Centralized environment configuration.
 * Every Azure credential is read here ONCE, so the rest of the codebase never
 * touches process.env directly. Missing values do not crash the server on
 * boot (so the dashboard/UI still loads) — instead, each service checks
 * `isConfigured` before calling out to Azure and returns a clear, actionable
 * error if credentials are missing.
 */
require('dotenv').config();

function clean(v) {
  return (v || '').trim();
}

const env = {
  port: parseInt(clean(process.env.PORT) || '8080', 10),
  nodeEnv: clean(process.env.NODE_ENV) || 'development',
  corsOrigin: clean(process.env.CORS_ORIGIN) || '*',

  vision: {
    endpoint: clean(process.env.VISION_ENDPOINT).replace(/\/+$/, ''),
    key: clean(process.env.VISION_KEY),
  },

  language: {
    endpoint: clean(process.env.LANGUAGE_ENDPOINT).replace(/\/+$/, ''),
    key: clean(process.env.LANGUAGE_KEY),
  },

  openai: {
    endpoint: clean(process.env.AZURE_OPENAI_ENDPOINT).replace(/\/+$/, ''),
    key: clean(process.env.AZURE_OPENAI_KEY),
    deployment: clean(process.env.AZURE_OPENAI_DEPLOYMENT),
    apiVersion: clean(process.env.AZURE_OPENAI_API_VERSION) || '2024-12-01-preview',
  },

  search: {
    endpoint: clean(process.env.AZURE_SEARCH_ENDPOINT).replace(/\/+$/, ''),
    key: clean(process.env.AZURE_SEARCH_KEY),
    index: clean(process.env.AZURE_SEARCH_INDEX) || 'carepilot-records',
    apiVersion: '2023-11-01',
  },

  speech: {
    key: clean(process.env.SPEECH_KEY),
    region: clean(process.env.SPEECH_REGION),
  },
};

env.vision.isConfigured = !!(env.vision.endpoint && env.vision.key);
env.language.isConfigured = !!(env.language.endpoint && env.language.key);
env.openai.isConfigured = !!(env.openai.endpoint && env.openai.key && env.openai.deployment);
env.search.isConfigured = !!(env.search.endpoint && env.search.key && env.search.index);
env.speech.isConfigured = !!(env.speech.key && env.speech.region);

module.exports = env;

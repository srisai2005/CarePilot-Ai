const { app } = require('@azure/functions');
const { json, withErrorHandling } = require('./_http');
const env = require('../src/config/env');

app.http('health', {
  route: 'health',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    return json(200, {
      status: 'ok',
      time: new Date().toISOString(),
      azureServices: {
        vision: env.vision.isConfigured,
        language: env.language.isConfigured,
        openai: env.openai.isConfigured,
        search: env.search.isConfigured,
        speech: env.speech.isConfigured,
      },
    });
  }),
});

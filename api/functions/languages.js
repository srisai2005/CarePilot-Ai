const { app } = require('@azure/functions');
const { json, withErrorHandling } = require('./_http');
const { LANGUAGES, DEFAULT_LANGUAGE } = require('../src/config/languages');

app.http('languages', {
  route: 'languages',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    return json(200, {
      languages: LANGUAGES.map((l) => ({ code: l.code, label: l.label, ttsVoice: l.ttsVoice })),
      defaultLanguage: DEFAULT_LANGUAGE,
    });
  }),
});

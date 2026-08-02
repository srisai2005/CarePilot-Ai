const { app } = require('@azure/functions');
const { withErrorHandling, readJsonBody, AppError } = require('./_http');
const speechService = require('../src/services/speechService');

app.http('speechTts', {
  route: 'speech/tts',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const { text, voice } = await readJsonBody(request);
    if (!text || !text.trim()) {
      throw new AppError('No text provided to synthesize.', 400);
    }
    const clipped = text.slice(0, 3000);
    const audioBuffer = await speechService.synthesizeSpeech(clipped, voice);

    return {
      status: 200,
      headers: { 'Content-Type': 'audio/mpeg' },
      body: audioBuffer,
    };
  }),
});

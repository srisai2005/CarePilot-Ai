const { app } = require('@azure/functions');
const { json, withErrorHandling, readJsonBody } = require('./_http');
const ragService = require('../src/services/ragService');
const recordService = require('../src/services/recordService');

app.http('chatHistory', {
  route: 'chat/history',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    const history = await ragService.getHistory();
    return json(200, { history });
  }),
});

app.http('chatAsk', {
  route: 'chat',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const { question } = await readJsonBody(request);
    const result = await ragService.askQuestion(recordService.DEFAULT_USER, question);
    return json(200, result);
  }),
});

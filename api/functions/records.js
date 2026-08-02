const { app } = require('@azure/functions');
const { json, withErrorHandling } = require('./_http');
const recordService = require('../src/services/recordService');

app.http('recordsList', {
  route: 'records',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    const records = await recordService.listRecords();
    return json(200, { records });
  }),
});

app.http('recordGet', {
  route: 'records/{id}',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const record = await recordService.getRecord(request.params.id);
    return json(200, { record });
  }),
});

app.http('recordSimplify', {
  route: 'records/{id}/simplify',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const result = await recordService.simplifySummary(request.params.id);
    return json(200, result);
  }),
});

app.http('recordDelete', {
  route: 'records/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    await recordService.deleteRecord(request.params.id);
    return json(200, { success: true });
  }),
});

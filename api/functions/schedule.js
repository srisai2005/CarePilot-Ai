const { app } = require('@azure/functions');
const { json, withErrorHandling } = require('./_http');
const scheduleService = require('../src/services/scheduleService');
const recordService = require('../src/services/recordService');

app.http('schedule', {
  route: 'schedule',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    const schedule = await scheduleService.getSchedule(recordService.DEFAULT_USER);
    return json(200, { schedule });
  }),
});

const { app } = require('@azure/functions');
const { json, withErrorHandling, readJsonBody } = require('./_http');
const reminderService = require('../src/services/reminderService');
const recordService = require('../src/services/recordService');

app.http('remindersList', {
  route: 'reminders',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async () => {
    const reminders = await reminderService.listReminders(recordService.DEFAULT_USER);
    return json(200, { reminders });
  }),
});

app.http('reminderCreate', {
  route: 'reminders',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const { title, date, notes, recordId } = await readJsonBody(request);
    const reminder = await reminderService.createReminder({
      title,
      date,
      notes,
      recordId,
      userId: recordService.DEFAULT_USER,
    });
    return json(201, { reminder });
  }),
});

app.http('reminderMarkDone', {
  route: 'reminders/{id}/done',
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const body = await readJsonBody(request);
    const reminder = await reminderService.markDone(request.params.id, body.done !== false);
    return json(200, { reminder });
  }),
});

app.http('reminderDelete', {
  route: 'reminders/{id}',
  methods: ['DELETE'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    await reminderService.deleteReminder(request.params.id);
    return json(200, { success: true });
  }),
});

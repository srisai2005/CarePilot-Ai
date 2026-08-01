const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const reminderService = require('../services/reminderService');
const recordService = require('../services/recordService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const reminders = await reminderService.listReminders(recordService.DEFAULT_USER);
    res.json({ reminders });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { title, date, notes, recordId } = req.body;
    const reminder = await reminderService.createReminder({
      title,
      date,
      notes,
      recordId,
      userId: recordService.DEFAULT_USER,
    });
    res.status(201).json({ reminder });
  })
);

router.post(
  '/:id/done',
  asyncHandler(async (req, res) => {
    const reminder = await reminderService.markDone(req.params.id, req.body.done !== false);
    res.json({ reminder });
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await reminderService.deleteReminder(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;

const express = require('express');

const router = express.Router();

router.use('/health', require('./health.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/records', require('./records.routes'));
router.use('/chat', require('./chat.routes'));
router.use('/schedule', require('./schedule.routes'));
router.use('/reminders', require('./reminders.routes'));
router.use('/dictionary', require('./dictionary.routes'));
router.use('/speech', require('./speech.routes'));
router.use('/search', require('./search.routes'));

module.exports = router;

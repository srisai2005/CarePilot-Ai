const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const scheduleService = require('../services/scheduleService');
const recordService = require('../services/recordService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const schedule = await scheduleService.getSchedule(recordService.DEFAULT_USER);
    res.json({ schedule });
  })
);

module.exports = router;

const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const ragService = require('../services/ragService');
const recordService = require('../services/recordService');

const router = express.Router();

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const history = await ragService.getHistory();
    res.json({ history });
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { question } = req.body;
    const result = await ragService.askQuestion(recordService.DEFAULT_USER, question);
    res.json(result);
  })
);

module.exports = router;

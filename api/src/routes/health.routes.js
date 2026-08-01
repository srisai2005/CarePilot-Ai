const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const env = require('../config/env');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      azureServices: {
        vision: env.vision.isConfigured,
        language: env.language.isConfigured,
        openai: env.openai.isConfigured,
        search: env.search.isConfigured,
        speech: env.speech.isConfigured,
      },
    });
  })
);

module.exports = router;

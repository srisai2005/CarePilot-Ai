const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const speechService = require('../services/speechService');

const router = express.Router();

router.post(
  '/tts',
  asyncHandler(async (req, res) => {
    const { text, voice } = req.body;
    if (!text || !text.trim()) {
      throw new AppError('No text provided to synthesize.', 400);
    }
    // Guard against extremely long TTS requests (cost + latency).
    const clipped = text.slice(0, 3000);
    const audioBuffer = await speechService.synthesizeSpeech(clipped, voice);
    res.set('Content-Type', 'audio/mpeg');
    res.send(audioBuffer);
  })
);

module.exports = router;

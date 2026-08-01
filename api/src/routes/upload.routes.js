const express = require('express');
const { upload } = require('../middleware/upload');
const asyncHandler = require('../middleware/asyncHandler');
const { AppError } = require('../middleware/errorHandler');
const recordService = require('../services/recordService');

const router = express.Router();

router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw new AppError('No file received. Attach a PDF, JPG, PNG, WAV, or MP3.', 400);
    }
    const record = await recordService.processUpload(req.file, {
      docType: req.body.docType,
      originalName: req.file.originalname,
    });
    res.status(201).json({ record });
  })
);

module.exports = router;

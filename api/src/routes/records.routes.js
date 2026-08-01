const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const recordService = require('../services/recordService');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const records = await recordService.listRecords();
    res.json({ records });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const record = await recordService.getRecord(req.params.id);
    res.json({ record });
  })
);

router.post(
  '/:id/simplify',
  asyncHandler(async (req, res) => {
    const result = await recordService.simplifySummary(req.params.id);
    res.json(result);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await recordService.deleteRecord(req.params.id);
    res.json({ success: true });
  })
);

module.exports = router;

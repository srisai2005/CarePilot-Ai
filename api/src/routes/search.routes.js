const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const searchService = require('../services/searchService');
const recordService = require('../services/recordService');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) throw new AppError('Provide a search query with ?q=', 400);

    const results = await searchService.search(q, { userId: recordService.DEFAULT_USER, top: 10 });

    // Group chunk hits back into unique records for a clean UI result list.
    const byRecord = new Map();
    for (const r of results) {
      if (!byRecord.has(r.recordId)) {
        byRecord.set(r.recordId, {
          recordId: r.recordId,
          docType: r.docType,
          title: r.title,
          date: r.date,
          snippet: r['@search.captions']?.[0]?.text || r.content.slice(0, 220),
          score: r['@search.score'],
        });
      }
    }

    res.json({ results: Array.from(byRecord.values()) });
  })
);

module.exports = router;

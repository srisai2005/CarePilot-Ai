const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const dictionary = require('../data/medicalAbbreviations.json');

const router = express.Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toLowerCase().trim();
    if (!q) return res.json({ entries: dictionary });

    const filtered = dictionary.filter(
      (d) =>
        d.abbr.toLowerCase().includes(q) ||
        d.meaning.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
    res.json({ entries: filtered });
  })
);

module.exports = router;

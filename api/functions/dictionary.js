const { app } = require('@azure/functions');
const { json, withErrorHandling } = require('./_http');
const dictionary = require('../src/data/medicalAbbreviations.json');

app.http('dictionary', {
  route: 'dictionary',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const q = (request.query.get('q') || '').toLowerCase().trim();
    if (!q) return json(200, { entries: dictionary });

    const filtered = dictionary.filter(
      (d) =>
        d.abbr.toLowerCase().includes(q) ||
        d.meaning.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
    return json(200, { entries: filtered });
  }),
});

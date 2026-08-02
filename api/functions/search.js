const { app } = require('@azure/functions');
const { json, withErrorHandling, AppError } = require('./_http');
const searchService = require('../src/services/searchService');
const recordService = require('../src/services/recordService');

app.http('search', {
  route: 'search',
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: withErrorHandling(async (request) => {
    const q = (request.query.get('q') || '').trim();
    if (!q) throw new AppError('Provide a search query with ?q=', 400);

    const results = await searchService.search(q, { userId: recordService.DEFAULT_USER, top: 10 });

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

    return json(200, { results: Array.from(byRecord.values()) });
  }),
});

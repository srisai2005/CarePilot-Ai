/**
 * Express app used by the Azure Function HTTP trigger (see HttpTrigger/index.js).
 *
 * This is the same app that used to be started directly with `app.listen()`
 * in the standalone backend/server.js — only the listening and static-file
 * serving have been removed, because in Azure Static Web Apps:
 *   - the frontend is served by the SWA content distribution layer, not by
 *     this app, and
 *   - the whole app is invoked per-request by the Functions host instead of
 *     listening on a port.
 *
 * All routes are still mounted under /api so the existing frontend fetch
 * calls (which hit '/api/...') keep working unchanged.
 */
const express = require('express');
const cors = require('cors');

const env = require('./src/config/env');
const routes = require('./src/routes');
const { notFoundHandler, errorHandler } = require('./src/middleware/errorHandler');
const searchService = require('./src/services/searchService');
const logger = require('./src/utils/logger');

const app = express();

// Best-effort, idempotent index creation. Runs once per warm Function
// instance instead of once per server boot (there's no persistent boot
// hook in a serverless app) — ensureIndex() is a cheap existence check.
searchService.ensureIndex().catch((err) => logger.warn('[app] ensureIndex failed:', err.message));

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api', routes);

app.use('/api', notFoundHandler);
app.use(errorHandler);

module.exports = app;

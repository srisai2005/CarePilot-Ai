/**
 * Shared helpers for Azure Functions v4 HTTP handlers.
 * Replaces the old Express `asyncHandler` + `errorHandler` middleware pair —
 * same error-shaping behavior (AppError -> clean {error, details} JSON),
 * just without Express/azure-function-express in between.
 */
const logger = require('../src/utils/logger');
const { AppError } = require('../src/middleware/errorHandler');

function json(status, body) {
  return {
    status,
    jsonBody: body,
    headers: { 'Content-Type': 'application/json' },
  };
}

/**
 * Wraps a v4 handler `(request, context) => { ... }` with the same
 * error-to-response shaping the old Express errorHandler did.
 */
function withErrorHandling(handler) {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (err) {
      const statusCode = err.statusCode || err.status || 500;

      if (statusCode >= 500) {
        logger.error(err.message, err.stack);
      } else {
        logger.warn(err.message);
      }

      let message = err.publicMessage || err.message || 'Something went wrong.';
      if (err.isAxiosError) {
        const azureMsg =
          err.response?.data?.error?.message || err.response?.data?.message || err.message;
        message = `Azure service error: ${azureMsg}`;
      }

      return json(statusCode, {
        error: message,
        ...(err.details ? { details: err.details } : {}),
      });
    }
  };
}

async function readJsonBody(request) {
  try {
    const text = await request.text();
    return text ? JSON.parse(text) : {};
  } catch (err) {
    throw new AppError('Request body must be valid JSON.', 400);
  }
}

module.exports = { json, withErrorHandling, readJsonBody, AppError };

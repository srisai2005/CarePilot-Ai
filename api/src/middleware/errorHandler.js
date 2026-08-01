const logger = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function notFoundHandler(req, res, next) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;

  if (statusCode >= 500) {
    logger.error(err.message, err.stack);
  } else {
    logger.warn(err.message);
  }

  // Surface a clean, actionable message when an Azure call fails, without
  // leaking raw axios/SDK stack traces to the client.
  let message = err.publicMessage || err.message || 'Something went wrong.';
  if (err.isAxiosError) {
    const azureMsg =
      err.response?.data?.error?.message || err.response?.data?.message || err.message;
    message = `Azure service error: ${azureMsg}`;
  }

  res.status(statusCode).json({
    error: message,
    ...(err.details ? { details: err.details } : {}),
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };

'use strict';

const logger = require('../config/plagard-core-shim').logger;

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    logger.error('Unhandled error', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
  }

  if (process.env.NODE_ENV === 'production' && !isOperational) {
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
    });
  }

  return res.status(statusCode).json({
    success: false,
    error: err.message,
    ...(err.code && { code: err.code }),
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Rota não encontrada: ${req.method} ${req.path}`,
  });
}

module.exports = { AppError, errorHandler, notFoundHandler };

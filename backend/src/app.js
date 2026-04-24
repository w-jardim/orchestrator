'use strict';

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const routes = require('./routes');
const { saude, healthFull } = require('./controllers/health.controller');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

const app = express();

// ─── Security headers ─────────────────────────────────────────────────────────
app.use(helmet());

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173'],
  credentials: true,
}));

// ─── Rate limiting ────────────────────────────────────────────────────────────
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path });
    res.status(429).json({ success: false, error: 'Muitas requisições' });
  },
}));

// ─── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// ─── Request logging ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const startedAt = Date.now();

  res.on('finish', () => {
    logger.operation('Request completed', {
      tenantId: req.tenantScope?.tenantId || req.user?.tenant_id || null,
      userId: req.user?.id || null,
      action: 'http.request',
      status: res.statusCode,
      duration: Date.now() - startedAt,
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
  });

  next();
});

// ─── Trust proxy (nginx) ──────────────────────────────────────────────────────
app.set('trust proxy', 1);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/saude', saude);
app.get('/health/full', healthFull);
app.use(routes);

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;

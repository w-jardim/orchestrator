'use strict';

const { Router } = require('express');
const { param, query, body } = require('express-validator');
const controller = require('../controllers/docker.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = Router();

// Todas as rotas Docker exigem autenticação
router.use(authenticate);

// ─── VALIDADORES ──────────────────────────────────────────────────────────────

const validateId = [
  param('id')
    .trim()
    .matches(/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,127}$/)
    .withMessage('ID de container inválido: use apenas letras, números, underscores, pontos e hifens'),
];

const validateLogsQuery = [
  query('tail')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('tail deve ser inteiro entre 1 e 500'),
  query('timestamps')
    .optional()
    .isBoolean()
    .withMessage('timestamps deve ser true ou false'),
];

const validateTimeout = [
  body('timeout')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('timeout deve ser inteiro entre 1 e 60 segundos'),
];

const validateListQuery = [
  query('all')
    .optional()
    .isBoolean()
    .withMessage('all deve ser true ou false'),
];

// ─── ROTAS SOMENTE LEITURA (VIEWER+) ─────────────────────────────────────────

router.get('/', authorize('VIEWER'), validateListQuery, controller.list);

router.get('/:id', authorize('VIEWER'), validateId, controller.inspect);

// ─── LOGS (OPERATOR+ por expor dados sensíveis de execução) ───────────────────

router.get('/:id/logs', authorize('OPERATOR'), [...validateId, ...validateLogsQuery], controller.logs);

// ─── AÇÕES MUTANTES (OPERATOR+) ───────────────────────────────────────────────

router.post('/:id/start', authorize('OPERATOR'), [...validateId, ...validateTimeout], controller.start);

router.post('/:id/stop', authorize('OPERATOR'), [...validateId, ...validateTimeout], controller.stop);

router.post('/:id/restart', authorize('OPERATOR'), [...validateId, ...validateTimeout], controller.restart);

module.exports = router;

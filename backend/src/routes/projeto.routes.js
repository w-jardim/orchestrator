'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const projetoController = require('../controllers/projeto.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');
const { tenantContext } = require('../middlewares/tenant-context.middleware');
const projetoService = require('../services/projeto.service');
const ambienteRoutes = require('./ambiente.routes');
const componenteRoutes = require('./componente.routes');

const router = express.Router();

// Middleware: autenticar, tenant context, RBAC
router.use(authenticate);
router.use(tenantContext);
router.use(rbac('ADMIN_MASTER', 'ADMIN', 'OPERATOR'));

// POST /api/v1/projetos
router.post(
  '/',
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('slug').trim().notEmpty().withMessage('Slug é obrigatório'),
  body('descricao').optional().trim(),
  body('tipo')
    .optional()
    .isIn(projetoService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  projetoController.criar,
);

// GET /api/v1/projetos
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('status')
    .optional()
    .isIn(projetoService.STATUS_VALIDOS)
    .withMessage('Status inválido'),
  query('tipo')
    .optional()
    .isIn(projetoService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  projetoController.listar,
);

// GET /api/v1/projetos/:id
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  projetoController.obter,
);

// GET /api/v1/projetos/:id/status
router.get(
  '/:id/status',
  param('id').isInt({ min: 1 }).toInt(),
  projetoController.obterStatus,
);

// PUT /api/v1/projetos/:id
router.put(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  body('nome').optional().trim().notEmpty(),
  body('descricao').optional().trim(),
  body('slug').optional().trim().notEmpty(),
  body('tipo')
    .optional()
    .isIn(projetoService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(projetoService.STATUS_VALIDOS)
    .withMessage('Status inválido'),
  projetoController.atualizar,
);

// DELETE /api/v1/projetos/:id
router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).toInt(),
  projetoController.deletar,
);

// Sub-rotas: Ambientes e Componentes
router.use('/:projetoId/ambientes', ambienteRoutes);
router.use('/:projetoId/componentes', componenteRoutes);

module.exports = router;

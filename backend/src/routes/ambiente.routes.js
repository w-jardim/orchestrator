'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const ambienteController = require('../controllers/ambiente.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const ambienteService = require('../services/ambiente.service');

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(tenantContext);
router.use(rbac('ADMIN_MASTER', 'ADMIN', 'OPERATOR'));

// POST /api/v1/projetos/:projetoId/ambientes
router.post(
  '/',
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('slug').trim().notEmpty().withMessage('Slug é obrigatório'),
  body('tipo')
    .isIn(ambienteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  body('porta').optional().isInt({ min: 1, max: 65535 }).toInt(),
  body('dominio').optional().trim(),
  ambienteController.criar,
);

// GET /api/v1/projetos/:projetoId/ambientes
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('tipo')
    .optional()
    .isIn(ambienteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  ambienteController.listar,
);

// GET /api/v1/projetos/:projetoId/ambientes/:ambienteId
router.get(
  '/:ambienteId',
  param('ambienteId').isInt({ min: 1 }).toInt(),
  ambienteController.obter,
);

// PUT /api/v1/projetos/:projetoId/ambientes/:ambienteId
router.put(
  '/:ambienteId',
  param('ambienteId').isInt({ min: 1 }).toInt(),
  body('nome').optional().trim().notEmpty(),
  body('slug').optional().trim().notEmpty(),
  body('tipo')
    .optional()
    .isIn(ambienteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  body('porta').optional().isInt({ min: 1, max: 65535 }).toInt(),
  body('dominio').optional().trim(),
  ambienteController.atualizar,
);

// DELETE /api/v1/projetos/:projetoId/ambientes/:ambienteId
router.delete(
  '/:ambienteId',
  param('ambienteId').isInt({ min: 1 }).toInt(),
  ambienteController.deletar,
);

module.exports = router;

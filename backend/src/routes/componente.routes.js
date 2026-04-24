'use strict';

const express = require('express');
const { body, param, query } = require('express-validator');
const componenteController = require('../controllers/componente.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const componenteService = require('../services/componente.service');

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(tenantContext);
router.use(rbac('ADMIN_MASTER', 'ADMIN', 'OPERATOR'));

// POST /api/v1/projetos/:projetoId/componentes
router.post(
  '/',
  body('nome').trim().notEmpty().withMessage('Nome é obrigatório'),
  body('slug').trim().notEmpty().withMessage('Slug é obrigatório'),
  body('tipo')
    .isIn(componenteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(componenteService.STATUS_VALIDOS)
    .withMessage('Status inválido'),
  componenteController.criar,
);

// GET /api/v1/projetos/:projetoId/componentes
router.get(
  '/',
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('tipo')
    .optional()
    .isIn(componenteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  query('status')
    .optional()
    .isIn(componenteService.STATUS_VALIDOS)
    .withMessage('Status inválido'),
  componenteController.listar,
);

// GET /api/v1/projetos/:projetoId/componentes/:componenteId
router.get(
  '/:componenteId',
  param('componenteId').isInt({ min: 1 }).toInt(),
  componenteController.obter,
);

// PUT /api/v1/projetos/:projetoId/componentes/:componenteId
router.put(
  '/:componenteId',
  param('componenteId').isInt({ min: 1 }).toInt(),
  body('nome').optional().trim().notEmpty(),
  body('slug').optional().trim().notEmpty(),
  body('tipo')
    .optional()
    .isIn(componenteService.TIPOS_VALIDOS)
    .withMessage('Tipo inválido'),
  body('status')
    .optional()
    .isIn(componenteService.STATUS_VALIDOS)
    .withMessage('Status inválido'),
  componenteController.atualizar,
);

// DELETE /api/v1/projetos/:projetoId/componentes/:componenteId
router.delete(
  '/:componenteId',
  param('componenteId').isInt({ min: 1 }).toInt(),
  componenteController.deletar,
);

module.exports = router;

'use strict';

const express = require('express');
const { param, body, query } = require('express-validator');
const { ROLES } = require('../config/plagard-core-shim').policies;
const controller = require('../controllers/docker-images.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const createDockerRateLimiter = require('../middlewares/rateLimit');
const validate = require('../middlewares/validate');

const router = express.Router();

router.use(authenticate);
router.use(tenantContext);
router.use(createDockerRateLimiter());

const validateImageId = [
  param('id')
    .trim()
    .matches(/^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i)
    .withMessage('ID de imagem inválido'),
];

const validatePullBody = [
  body('image')
    .trim()
    .notEmpty()
    .withMessage('Nome da imagem é obrigatório')
    .matches(/^(?:(?:[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[0-9]+)?\/)*[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)(?::[\w][\w.-]{0,127})?$/i)
    .withMessage('Nome da imagem inválido'),
];

const validateRemoveBody = [body('force').optional().isBoolean().withMessage('force deve ser booleano')];

// GET /api/v1/docker/images
router.get('/', rbac(ROLES.VIEWER), validate, controller.list);

// GET /api/v1/docker/images/:id
router.get('/:id', rbac(ROLES.VIEWER), validateImageId, validate, controller.inspect);

// POST /api/v1/docker/images/pull
router.post('/pull', rbac(ROLES.ADMIN), validatePullBody, validate, controller.pull);

// DELETE /api/v1/docker/images/:id
router.delete('/:id', rbac(ROLES.ADMIN), validateImageId, validateRemoveBody, validate, controller.remove);

module.exports = router;

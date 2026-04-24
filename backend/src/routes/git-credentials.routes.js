'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { ROLES } = require('../config/plagard-core-shim').policies;
const controller = require('../controllers/git-credentials.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const rbac = require('../middlewares/rbac');
const tenantContext = require('../middlewares/tenant-context.middleware');
const validate = require('../middlewares/validate');

const router = Router();

router.use(authenticate);
router.use(tenantContext);

const validateName = [
  param('name').trim().isLength({ min: 1, max: 50 }).withMessage('Nome da chave inválido'),
];

const validateGenerateKeyBody = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Nome da chave é obrigatório'),
  body('comment').optional().isString().withMessage('Comentário deve ser string'),
];

const validateAddKeyBody = [
  body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Nome da chave é obrigatório'),
  body('privateKey').trim().notEmpty().withMessage('Chave privada é obrigatória'),
  body('publicKey').trim().notEmpty().withMessage('Chave pública é obrigatória'),
];

const validateTestAuthBody = [
  body('repositoryUrl')
    .trim()
    .isURL({ require_protocol: true })
    .withMessage('URL do repositório inválida'),
];

const validateConfigureGitBody = [
  body('name').trim().isLength({ min: 1 }).withMessage('Nome do usuário é obrigatório'),
  body('email').trim().isEmail().withMessage('Email inválido'),
];

router.get('/', rbac(ROLES.ADMIN), validate, controller.listKeys);

router.post(
  '/generate',
  rbac(ROLES.ADMIN),
  validateGenerateKeyBody,
  validate,
  controller.generateKey
);

router.post('/add', rbac(ROLES.ADMIN), validateAddKeyBody, validate, controller.addKey);

router.delete('/:name', rbac(ROLES.ADMIN), validateName, validate, controller.removeKey);

router.get('/:name/fingerprint', rbac(ROLES.ADMIN), validateName, validate, controller.getFingerprint);

router.post('/test-auth', rbac(ROLES.ADMIN), validateTestAuthBody, validate, controller.testAuth);

router.post(
  '/configure',
  rbac(ROLES.ADMIN),
  validateConfigureGitBody,
  validate,
  controller.configureGit
);

module.exports = router;

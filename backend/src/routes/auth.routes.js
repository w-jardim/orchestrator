'use strict';

const { Router } = require('express');
const { body } = require('express-validator');
const { loginHandler, meHandler } = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = Router();

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Senha deve ter pelo menos 6 caracteres'),
];

router.post('/login', loginValidation, loginHandler);
router.get('/me', authenticate, meHandler);

module.exports = router;

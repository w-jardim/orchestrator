'use strict';

const { validationResult } = require('express-validator');
const { login } = require('../services/auth.service');
const { findById } = require('../services/user.service');
const { AppError } = require('../middlewares/error.middleware');

async function loginHandler(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;
    const result = await login(email, password);

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function meHandler(req, res, next) {
  try {
    const user = await findById(req.user.id);
    if (!user) throw new AppError('Usuário não encontrado', 404, 'USER_NOT_FOUND');
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

module.exports = { loginHandler, meHandler };

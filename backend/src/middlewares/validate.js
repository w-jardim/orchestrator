'use strict';

const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, error: 'Validation failed', details: errors.array(), code: 'VALIDATION_ERROR' });
  }
  return next();
}

module.exports = validate;

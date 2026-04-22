'use strict';

const { Router } = require('express');
const { saude } = require('../controllers/health.controller');

const router = Router();

router.get('/saude', saude);

module.exports = router;

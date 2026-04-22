'use strict';

const { Router } = require('express');
const { saude, healthFull } = require('../controllers/health.controller');

const router = Router();

router.get('/saude', saude);
router.get('/health/full', healthFull);

module.exports = router;

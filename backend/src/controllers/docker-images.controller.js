'use strict';

const { validationResult } = require('express-validator');
const dockerImagesService = require('../services/docker-images.service');
const { AppError } = require('../middlewares/error.middleware');

function handleValidation(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({ success: false, errors: errors.array() });
    return false;
  }
  return true;
}

async function list(req, res, next) {
  try {
    const images = await dockerImagesService.listImages({
      user: req.user,
      ip: req.ip,
    });
    return res.json({ success: true, count: images.length, data: images });
  } catch (err) {
    return next(err);
  }
}

async function inspect(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const image = await dockerImagesService.getImage({
      id: req.params.id,
      user: req.user,
      ip: req.ip,
    });
    return res.json({ success: true, data: image });
  } catch (err) {
    return next(err);
  }
}

async function pull(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { image } = req.body;

    if (!image) {
      throw new AppError('Imagem é obrigatória', 422, 'VALIDATION_ERROR');
    }

    const result = await dockerImagesService.pullImage({
      image,
      user: req.user,
      ip: req.ip,
    });

    return res.status(201).json({
      success: true,
      message: 'Imagem baixada com sucesso',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

async function remove(req, res, next) {
  try {
    if (!handleValidation(req, res)) return;
    const { force } = req.body;

    const result = await dockerImagesService.deleteImage({
      id: req.params.id,
      force: force === true || force === 'true',
      user: req.user,
      ip: req.ip,
    });

    return res.json({
      success: true,
      message: 'Imagem deletada com sucesso',
      data: result,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { list, inspect, pull, remove };

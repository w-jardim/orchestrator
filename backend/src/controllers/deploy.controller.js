'use strict';

const deployService = require('../services/deploy.service');

async function create(req, res, next) {
  try {
    const deploy = await deployService.createDeploy({
      name: req.body.name,
      image: req.body.image,
      ports: req.body.ports,
      env: req.body.env,
      user: req.user,
      ip: req.ip,
    });

    return res.status(202).json({ success: true, data: deploy });
  } catch (err) {
    return next(err);
  }
}

async function list(req, res, next) {
  try {
    const deploys = await deployService.listDeploys({ user: req.user });
    return res.status(200).json({ success: true, data: deploys });
  } catch (err) {
    return next(err);
  }
}

async function getById(req, res, next) {
  try {
    const deploy = await deployService.getDeploy({ id: Number(req.params.id), user: req.user });
    return res.status(200).json({ success: true, data: deploy });
  } catch (err) {
    return next(err);
  }
}

async function redeploy(req, res, next) {
  try {
    const deploy = await deployService.redeploy({
      id: Number(req.params.id),
      user: req.user,
      ip: req.ip,
    });

    return res.status(202).json({ success: true, data: deploy });
  } catch (err) {
    return next(err);
  }
}

async function stop(req, res, next) {
  try {
    const deploy = await deployService.stopDeploy({
      id: Number(req.params.id),
      user: req.user,
      ip: req.ip,
    });

    return res.status(200).json({ success: true, data: deploy });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  list,
  getById,
  redeploy,
  stop,
};

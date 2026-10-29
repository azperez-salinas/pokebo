const capturesService = require('../services/captures.service');

async function create(req, res, next) {
  try {
    const result = await capturesService.create(req.user.id, req.body);
    res.status(201).json({ data: result });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const result = await capturesService.listByUser(req.user.id, req.query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  create,
  listMine,
};

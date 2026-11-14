const capturesService = require('../services/captures.service');
const { identifySpecies } = require('../services/ai.service');

async function create(req, res, next) {
  try {
    const image = Buffer.from(req.body.imageBase64, 'base64');
    const ai = await identifySpecies(image);
    const result = await capturesService.create(req.user.id, { ...req.body, ai });
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

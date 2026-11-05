const achievementsService = require('../services/achievements.service');

async function list(req, res, next) {
  try {
    res.status(200).json(await achievementsService.listForUser(req.user.id));
  } catch (err) {
    next(err);
  }
}

module.exports = { list };

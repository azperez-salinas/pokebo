const speciesService = require('../services/species.service');

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

async function getById(req, res, next) {
  try {
    const species = await speciesService.getById(req.params.id, req.user.id);
    res.status(200).json({ species });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list: notImplemented,
  getById,
};

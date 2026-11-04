const sightingsService = require('../services/sightings.service');

// El mapa muestra los avistamientos de otros usuarios (los propios no)
async function listSightings(req, res, next) {
  try {
    const sightings = await sightingsService.listNear(req.query, { excludeUserId: req.user.id });
    res.status(200).json({ sightings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSightings,
};

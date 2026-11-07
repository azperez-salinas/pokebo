const sightingsService = require('../services/sightings.service');

// El mapa muestra los avistamientos de otros usuarios (los propios no)
async function listSightings(req, res, next) {
  try {
    const { lat, lng, radiusMeters } = req.query;
    const options = {
      excludeUserId: req.user.id,
    };

    const sightings = radiusMeters !== undefined
      ? await sightingsService.listInRadius(
          { lat, lng, radiusMeters },
          options
        ) :await sightingsService.listNear(req.query, options);
      res.status(200).json({ sightings });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSightings,
};

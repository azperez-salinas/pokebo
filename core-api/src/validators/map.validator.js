const Joi = require('joi');

const H3_INDEX = Joi.string().pattern(/^[0-9a-f]{15}$/);

// GET /map/sightings: o una celda (h3Index) o un punto (lat y lng), nunca las dos cosas. k = anillos de vecinas.
const sightings = {
  query: Joi.object({
    h3Index: H3_INDEX,
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180),
    k: Joi.number().integer().min(1).max(2).default(1),
    radiusMeters: 500,
  })
    .xor('h3Index', 'lat')
    .with('lat', 'lng')
    .with('lng', 'lat')
    .with('radiusMeters', 'lat'),
};

module.exports = { sightings };

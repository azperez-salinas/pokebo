// Avistamientos para el mapa.
const Sighting = require('../models/Sighting.model');
const { latLngToCell, assertValidCell, cellsAround } = require('../utils/h3');

const SIGHTING_TTL_MS = 24 * 60 * 60 * 1000; // los avistamientos duran 24 horas
const LIST_LIMIT = 200;

// Forma pública de un avistamiento: no expone el usuario ni la captura que lo originó
function toPublicSighting(sighting) {
  const [lng, lat] = sighting.location.coordinates;
  return {
    id: String(sighting._id),
    species: sighting.species ? { id: String(sighting.species._id), commonName: sighting.species.commonName } : null,
    h3Index: sighting.h3Index,
    location: { lat, lng },
    seenAt: sighting.seenAt,
    expiresAt: sighting.expiresAt,
  };
}

// Avistamientos vigentes en un conjunto de celdas H3, sin los de excludeUserId.
// Mongo borra por TTL con hasta 60 s de atraso, así que se filtra expiresAt en la consulta.
async function listInCells(cells, { excludeUserId } = {}) {
  const filter = { h3Index: { $in: cells }, expiresAt: { $gt: new Date() } };
  if (excludeUserId) filter.user = { $ne: excludeUserId };

  const sightings = await Sighting.find(filter)
    .sort({ seenAt: -1 })
    .limit(LIST_LIMIT)
    .populate('species', 'commonName')
    .lean();
  return sightings.map(toPublicSighting);
}

// Avistamientos alrededor de una celda (h3Index) o de un punto (lat, lng), k anillos a la redonda.
async function listNear({ h3Index, lat, lng, k = 1 }, options = {}) {
  const center = h3Index ? assertValidCell(h3Index) : latLngToCell(lat, lng);
  return listInCells(cellsAround(center, k), options);
}

// Avistamientos vigentes dentro de un radio geográfico.
// Utiliza el índice 2dsphere de Sighting.location.
async function listInRadius(
  { lat, lng, radiusMeters },
  { excludeUserId } = {}
) {
  const filter = {
    location: {
      $geoWithin: {
        $centerSphere: [
          [lng, lat],
          radiusMeters / 6378137,
        ],
      },
    },
    expiresAt: { $gt: new Date() },
  };

  if (excludeUserId) {
    filter.user = { $ne: excludeUserId };
  }

  const sightings = await Sighting.find(filter)
    .sort({ seenAt: -1 })
    .limit(LIST_LIMIT)
    .populate('species', 'commonName')
    .lean();

  return sightings.map(toPublicSighting);
}

// Crea el avistamiento que genera una captura (se ve en el mapa hasta que expira)
async function createFromCapture(capture) {
  return Sighting.create({
    species: capture.species,
    capture: capture._id,
    user: capture.user,
    location: capture.location,
    h3Index: capture.h3Index,
    seenAt: capture.capturedAt,
    expiresAt: new Date(capture.capturedAt.getTime() + SIGHTING_TTL_MS),
  });
}

module.exports = { listNear, listInCells, listInRadius, createFromCapture };

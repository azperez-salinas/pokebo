// Avistamientos para el mapa.
const Sighting = require('../models/Sighting.model');

const SIGHTING_TTL_MS = 24 * 60 * 60 * 1000; // los avistamientos duran 24 horas

async function listNear(query) {
  // TODO
  throw new Error('not implemented');
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

module.exports = { listNear, createFromCapture };

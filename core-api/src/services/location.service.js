// Ubicación de usuarios con índices H3 guardados en Redis (no usa Mongoose para la celda).
const { redisClient } = require('../config/redis');
const User = require('../models/User.model');
const sightingsService = require('./sightings.service');
const { AppError } = require('../utils/errors');
const { latLngToCell: h3LatLngToCell, assertValidCell, cellsAround, ringDistance } = require('../utils/h3');

const USER_CELL_TTL_SECONDS = 60 * 60; // la última celda conocida de un usuario vale 1 hora
const SEEN_TTL_SECONDS = 24 * 60 * 60; // igual que la vida de un avistamiento

const cellKey = (userId) => `user:cell:${userId}`;
const seenKey = (userId) => `seen:${userId}`; // set con los avistamientos que ya se le avisaron al usuario

// Guarda la celda actual del usuario y devuelve la anterior (o null)
async function updateLocation(userId, h3Index) {
  const previous = await redisClient.get(cellKey(userId));
  await redisClient.set(cellKey(userId), h3Index, { expiration: { type: 'EX', value: USER_CELL_TTL_SECONDS } });
  return previous || null;
}

// Borra todo lo que el servidor sabe de la ubicación del usuario
async function deleteLocation(userId) {
  await redisClient.del([cellKey(userId), seenKey(userId)]);
}

// El usuario avisa en qué celda está. Se guarda y, si tiene los avisos activados, se devuelven los
// avistamientos de otros usuarios en su celda y las vecinas que todavía no se le habían avisado.
async function reportLocation(userId, h3Index) {
  assertValidCell(h3Index);

  const user = await User.findById(userId).select('settings.nearbyAlerts').lean();
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');

  await updateLocation(userId, h3Index);
  if (!user.settings?.nearbyAlerts) return { nearby: [] };

  const sightings = await sightingsService.listInCells(cellsAround(h3Index, 1), { excludeUserId: userId });

  // SADD devuelve 1 si el id era nuevo: así dos pedidos en paralelo no avisan dos veces lo mismo
  const nearby = [];
  for (const sighting of sightings) {
    if ((await redisClient.sAdd(seenKey(userId), sighting.id)) !== 1) continue;
    const distance = ringDistance(h3Index, sighting.h3Index);
    nearby.push({
      id: sighting.id,
      species: sighting.species,
      h3Index: sighting.h3Index,
      seenAt: sighting.seenAt,
      ringDistance: distance,
      zone: distance === 0 ? 'own' : 'near',
    });
  }
  if (nearby.length > 0) await redisClient.expire(seenKey(userId), SEEN_TTL_SECONDS);

  return { nearby };
}

async function getUsersInCell(h3Index) {
  // TODO
  throw new Error('not implemented');
}

// Id de la celda H3 donde cae el punto
async function latLngToCell(lat, lng) {
  return h3LatLngToCell(lat, lng);
}

module.exports = { updateLocation, deleteLocation, reportLocation, getUsersInCell, latLngToCell, cellsAround, assertValidCell, ringDistance };

// Ubicación de usuarios con índices H3 guardados en Redis (no usa Mongoose para la celda).
const { redisClient } = require('../config/redis');
const User = require('../models/User.model');
const sightingsService = require('./sightings.service');
const notificationsService = require('./notifications.service');
const { AppError } = require('../utils/errors');
const { latLngToCell: h3LatLngToCell, assertValidCell, cellsAround, ringDistance } = require('../utils/h3');

const USER_CELL_TTL_SECONDS = 2 * 60; // polling cada 45 s: al salir de primer plano deja de estar activo pronto
const SEEN_TTL_SECONDS = 24 * 60 * 60; // igual que la vida de un avistamiento

const cellKey = (userId) => `user:cell:${userId}`;
const cellUsersKey = (h3Index) => `cell:users:${h3Index}`;
const seenKey = (userId) => `seen:${userId}`; // set con los avistamientos que ya se le avisaron al usuario
const inboxKey = (userId) => `inbox:seen:${userId}`; // evita duplicar el avistamiento en el buzón

// Guarda la celda actual del usuario y devuelve la anterior (o null)
async function updateLocation(userId, h3Index) {
  const previous = await redisClient.get(cellKey(userId));
  const transaction = redisClient.multi();
  if (previous && previous !== h3Index) transaction.zRem(cellUsersKey(previous), String(userId));
  transaction
    .set(cellKey(userId), h3Index, { expiration: { type: 'EX', value: USER_CELL_TTL_SECONDS } })
    .zAdd(cellUsersKey(h3Index), { score: Date.now(), value: String(userId) })
    .expire(cellUsersKey(h3Index), USER_CELL_TTL_SECONDS * 2);
  await transaction.exec();
  return previous || null;
}

// Borra todo lo que el servidor sabe de la ubicación del usuario
async function deleteLocation(userId) {
  const current = await redisClient.get(cellKey(userId));
  if (current) await redisClient.zRem(cellUsersKey(current), String(userId));
  await redisClient.del([cellKey(userId), seenKey(userId), inboxKey(userId)]);
}

// Mismo texto que la notificación del teléfono (app/src/utils/nearbyNotification.js)
function nearbyNotificationText(nearby) {
  const nameOf = (item) => item.species?.commonName || 'un animal';
  if (nearby.length === 1) {
    return {
      title: `${nameOf(nearby[0])} cerca de vos`,
      body: nearby[0].zone === 'own' ? 'Lo vieron hace poco en tu zona.' : 'Lo vieron hace poco en una zona vecina.',
    };
  }
  const names = [...new Set(nearby.map(nameOf))];
  const rest = names.length - 3;
  const shown = names.slice(0, 3).join(', ');
  return { title: `${nearby.length} avistamientos cerca de vos`, body: rest > 0 ? `${shown} y ${rest} más.` : `${shown}.` };
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
  if (nearby.length > 0) {
    await redisClient.expire(seenKey(userId), SEEN_TTL_SECONDS);
    const inboxSightings = [];
    for (const item of nearby) {
      if ((await redisClient.sAdd(inboxKey(userId), item.id)) === 1) inboxSightings.push(item);
    }
    if (inboxSightings.length > 0) {
      await redisClient.expire(inboxKey(userId), SEEN_TTL_SECONDS);
      await notificationsService.createSafe(userId, {
        type: 'nearby',
        ...nearbyNotificationText(inboxSightings),
        data: { h3Index, sightingIds: inboxSightings.map((item) => item.id) },
      });
    }
  }

  return { nearby };
}

async function getUsersInCell(h3Index) {
  assertValidCell(h3Index);
  const key = cellUsersKey(h3Index);
  const cutoff = Date.now() - USER_CELL_TTL_SECONDS * 1000;
  await redisClient.zRemRangeByScore(key, 0, cutoff);
  return redisClient.zRangeByScore(key, cutoff, '+inf');
}

async function getUsersInCells(h3Indexes) {
  const groups = await Promise.all(h3Indexes.map(getUsersInCell));
  return [...new Set(groups.flat())];
}

// El sighting es el evento: al crearse genera buzón para usuarios activos en su celda o vecinas.
// El polling todavía lo devuelve una vez para poder mostrar el aviso local sin duplicar el buzón.
async function notifyUsersAboutSighting(sighting, species) {
  const candidateIds = (await getUsersInCells(cellsAround(sighting.h3Index, 1)))
    .filter((id) => String(id) !== String(sighting.user));
  if (candidateIds.length === 0) return 0;

  const users = await User.find({
    _id: { $in: candidateIds },
    'settings.nearbyAlerts': true,
  }).select('_id').lean();

  let notified = 0;
  for (const user of users) {
    const userId = String(user._id);
    if ((await redisClient.sAdd(inboxKey(userId), String(sighting._id))) !== 1) continue;
    await redisClient.expire(inboxKey(userId), SEEN_TTL_SECONDS);
    const saved = await notificationsService.createSafe(userId, {
      type: 'nearby',
      title: `${species.commonName || 'Un animal'} cerca de vos`,
      body: 'Se registró un nuevo avistamiento en tu zona.',
      data: { sightingId: sighting._id, h3Index: sighting.h3Index },
    });
    if (saved) notified += 1;
  }
  return notified;
}

// Id de la celda H3 donde cae el punto
async function latLngToCell(lat, lng) {
  return h3LatLngToCell(lat, lng);
}

module.exports = {
  updateLocation,
  deleteLocation,
  reportLocation,
  getUsersInCell,
  getUsersInCells,
  notifyUsersAboutSighting,
  latLngToCell,
  cellsAround,
  assertValidCell,
  ringDistance,
};

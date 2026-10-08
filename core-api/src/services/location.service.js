// Ubicación de usuarios con índices H3 guardados en Redis (no usa Mongoose).
async function updateLocation(userId, lat, lng) {
  // TODO
  throw new Error('not implemented');
}

async function getUsersInCell(h3Index) {
  // TODO
  throw new Error('not implemented');
}

async function latLngToCell(lat, lng) {
  // TODO
  throw new Error('not implemented');
}

module.exports = { updateLocation, getUsersInCell, latLngToCell };

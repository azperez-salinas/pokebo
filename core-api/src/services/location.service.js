// Ubicación de usuarios con índices H3 guardados en Redis (no usa Mongoose).
const { latLngToCell: h3LatLngToCell } = require('h3-js');

// Resolución de las celdas H3 (~460 m de lado). Se usa para el h3Index de capturas y avistamientos.
const H3_RESOLUTION = 8;

async function updateLocation(userId, lat, lng) {
  // TODO
  throw new Error('not implemented');
}

async function getUsersInCell(h3Index) {
  // TODO
  throw new Error('not implemented');
}

// Id de la celda H3 donde cae el punto
async function latLngToCell(lat, lng) {
  return h3LatLngToCell(lat, lng, H3_RESOLUTION);
}

module.exports = { updateLocation, getUsersInCell, latLngToCell };

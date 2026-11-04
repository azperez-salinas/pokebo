// Utilidades H3 compartidas por los servicios del Core (sin Redis ni Mongo).
const h3 = require('h3-js');
const { AppError } = require('./errors');

// Resolución de las celdas H3 (~460 m de lado). Se usa para el h3Index de capturas, avistamientos y usuarios.
const H3_RESOLUTION = 8;

// Id de la celda H3 donde cae el punto
function latLngToCell(lat, lng) {
  return h3.latLngToCell(lat, lng, H3_RESOLUTION);
}

// Tira 400 INVALID_H3_CELL si no es una celda H3 válida de la resolución que usa el sistema
function assertValidCell(h3Index) {
  let valid = false;
  try {
    valid = typeof h3Index === 'string' && h3.isValidCell(h3Index) && h3.getResolution(h3Index) === H3_RESOLUTION;
  } catch {
    valid = false;
  }
  if (!valid) throw new AppError(400, 'INVALID_H3_CELL', 'La celda H3 no es válida');
  return h3Index;
}

// La celda y sus vecinas hasta k anillos (k=1 son 7 celdas, ~1 km de alcance)
function cellsAround(h3Index, k = 1) {
  return h3.gridDisk(h3Index, k);
}

// Distancia en anillos entre dos celdas; Infinity si h3-js no la puede calcular (celdas lejanas o pentágonos)
function ringDistance(a, b) {
  try {
    return h3.gridDistance(a, b);
  } catch {
    return Infinity;
  }
}

module.exports = { H3_RESOLUTION, latLngToCell, assertValidCell, cellsAround, ringDistance };

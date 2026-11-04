// Lógica pura (sin React) del overlay de hexágonos H3 para desarrollo en el mapa.
import { cellToBoundary, gridDisk, latLngToCell, polygonToCells } from 'h3-js';

// Misma resolución que usa el Core (~460 m de lado).
export const H3_RESOLUTION = 8;

// Más lejos que esto se dibujarían demasiadas celdas: el overlay pide acercar el mapa.
export const MAX_LATITUDE_DELTA = 0.08;
const MAX_CELLS = 250;

// polygonToCells solo toma las celdas cuyo centro cae adentro del rectángulo. Se agranda unos 600 m para
// que no falten las celdas que se ven a medias en el borde de la pantalla.
const EDGE_PADDING_DEGREES = 0.006;

export function cellOf(lat, lng) {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

// Celdas que cubren la región visible del mapa ({ latitude, longitude, latitudeDelta, longitudeDelta }).
// Devuelve null si el mapa está demasiado lejos.
export function cellsForRegion(region) {
  if (!region || region.latitudeDelta > MAX_LATITUDE_DELTA) return null;
  const north = region.latitude + region.latitudeDelta / 2 + EDGE_PADDING_DEGREES;
  const south = region.latitude - region.latitudeDelta / 2 - EDGE_PADDING_DEGREES;
  const east = region.longitude + region.longitudeDelta / 2 + EDGE_PADDING_DEGREES;
  const west = region.longitude - region.longitudeDelta / 2 - EDGE_PADDING_DEGREES;
  const cells = polygonToCells([[north, west], [north, east], [south, east], [south, west]], H3_RESOLUTION);
  return cells.length > MAX_CELLS ? null : cells;
}

// Arma lo que se dibuja: un polígono por celda, marcando la celda del usuario, sus vecinas y cuántos
// avistamientos (los que devuelve GET /map/sightings) hay en cada una.
export function buildOverlay({ cells, userCell = null, sightings = [] }) {
  const counts = new Map();
  for (const sighting of sightings) counts.set(sighting.h3Index, (counts.get(sighting.h3Index) || 0) + 1);
  const userRing = userCell ? new Set(gridDisk(userCell, 1)) : new Set();

  return cells.map((cell) => ({
    id: cell,
    coordinates: cellToBoundary(cell).map(([latitude, longitude]) => ({ latitude, longitude })),
    isUserCell: cell === userCell,
    inUserRing: userRing.has(cell),
    sightings: counts.get(cell) || 0,
  }));
}

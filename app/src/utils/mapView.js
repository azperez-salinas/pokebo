// Lógica pura (sin React) del encuadre del mapa: región del hexágono, y límites de zoom y desplazamiento.
import { cellToBoundary, gridDisk } from 'h3-js';

const METERS_PER_DEGREE = 111320; // por grado de latitud (el de longitud se achica con cos(latitud))
const WORLD_TILE_DP = 256; // ancho del mundo en zoom 0, en píxeles independientes de densidad

// Celda + vecinas hasta k anillos
export const ringOf = (cell, k) => gridDisk(cell, k);

// Rectángulo { north, south, east, west } que contiene las celdas
export function boundsOf(cells) {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;
  for (const cell of cells) {
    for (const [lat, lng] of cellToBoundary(cell)) {
      north = Math.max(north, lat);
      south = Math.min(south, lat);
      east = Math.max(east, lng);
      west = Math.min(west, lng);
    }
  }
  return { north, south, east, west };
}

// Región { latitude, longitude, latitudeDelta, longitudeDelta } centrada en `center` que muestra `bounds`.
// aspect = alto / ancho de la pantalla. Los grados de longitud se achican con cos(latitud): por eso se corrige.
export function regionFitting(bounds, center, aspect, factor = 1) {
  const lonSpan = bounds.east - bounds.west;
  const latSpan = bounds.north - bounds.south;
  const cos = Math.cos((center.latitude * Math.PI) / 180);
  const longitudeDelta = Math.max(lonSpan, latSpan / (cos * aspect)) * factor;
  return { latitude: center.latitude, longitude: center.longitude, latitudeDelta: longitudeDelta * cos * aspect, longitudeDelta };
}

// Nivel de zoom (mapas de Google) con el que un ancho de `lonSpan` grados ocupa `widthDp` de pantalla
export function zoomForLongitudeSpan(lonSpan, widthDp) {
  return Math.log2((widthDp * 360) / (WORLD_TILE_DP * lonSpan));
}

// Distancia de cámara (metros) con la que un ancho de `lonSpan` grados ocupa el ancho de una pantalla de proporción
// aspect = alto / ancho (Apple Maps: cameraZoomRange). fovDegrees es el ángulo de visión vertical de la cámara.
export function cameraDistanceForLongitudeSpan(lonSpan, latitude, aspect, fovDegrees) {
  const widthMeters = lonSpan * METERS_PER_DEGREE * Math.cos((latitude * Math.PI) / 180);
  const heightMeters = widthMeters * aspect;
  return heightMeters / (2 * Math.tan((fovDegrees * Math.PI) / 360));
}

// Lleva el punto adentro del rectángulo `bounds` { north, south, east, west } (si ya está adentro, lo devuelve igual)
export function clampToBounds(point, bounds) {
  return {
    latitude: Math.min(Math.max(point.latitude, bounds.south), bounds.north),
    longitude: Math.min(Math.max(point.longitude, bounds.west), bounds.east),
  };
}

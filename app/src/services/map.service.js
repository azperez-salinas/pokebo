import { authRequest } from './session';

// GET /map/sightings: avistamientos vigentes de otros usuarios alrededor de una celda H3 (h3Index) o de un
// punto (lat y lng). k = anillos de celdas vecinas (1 o 2, por defecto 1). Devuelve el array de avistamientos.
export async function getSightings(query = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  });
  const data = await authRequest(`/map/sightings?${params.toString()}`);
  return data.sightings;
}

// H3 en el cliente: misma resolución que usa el Core (~460 m de lado).
import { latLngToCell } from 'h3-js';

export const H3_RESOLUTION = 8;

// Id de la celda H3 donde cae el punto
export function cellOf(lat, lng) {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

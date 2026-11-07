// H3 en el cliente: misma resolución que usa el Core (~28 m de lado, menos de una cuadra).
import { latLngToCell } from "h3-js";

export const H3_RESOLUTION = 11;

// Id de la celda H3 donde cae el punto
export function cellOf(lat, lng) {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

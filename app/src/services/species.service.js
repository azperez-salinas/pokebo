import { request } from './api';
import { authRequest } from './session';

export async function listSpecies(filters) {
  // TODO
  throw new Error('not implemented');
}

// GET /species/:id: ficha completa + progress.captures (capturas del usuario de esa especie)
export async function getSpecies(id) {
  return authRequest(`/species/${id}`);
}

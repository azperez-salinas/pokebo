import config from '../config';

// Cliente HTTP base contra el Edge API.
// TODO: agregar headers de versión de app y Authorization, refresh de token y manejo de errores.
export async function request(path, options = {}) {
  throw new Error('not implemented');
}

export const API_BASE_URL = config.apiUrl;

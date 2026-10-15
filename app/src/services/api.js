import config from '../config';

// Cliente HTTP base contra el Edge API.
// TODO: agregar headers de versión de app y Authorization, refresh de token y manejo de errores.
export async function request(path, options = {}) {
  throw new Error('not implemented');
}

// La versión de la API se define solo acá: para pasar a v2 se cambia esta constante.
export const API_VERSION = 'v1';

// Endpoints versionados (auth, users, species, ...): los servicios piden paths relativos, ej. request('/species').
export const API_BASE_URL = `${config.apiUrl}/api/${API_VERSION}`;

// Endpoints globales, sin versión (ej. GET /api/app-config, que la app consulta antes del login).
export const API_GLOBAL_URL = `${config.apiUrl}/api`;

import config from '../config';
import appConfig from '../../app.json';

// Cliente HTTP base contra el Edge API. Los endpoints protegidos agregan Authorization desde su servicio.
export async function request(path, options = {}) {
  const { method = 'GET', body, headers = {} } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-App-Version': appConfig.expo.version,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error('No se pudo conectar al servidor. Revisá la URL del Edge API y tu conexión.');
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }

  if (!response.ok) {
    const error = new Error(data?.message || 'No se pudo completar la solicitud.');
    error.code = data?.code;
    throw error;
  }
  return data;
}

// La versión de la API se define solo acá: para pasar a v2 se cambia esta constante.
export const API_VERSION = 'v1';

// Endpoints versionados (auth, users, species, ...): los servicios piden paths relativos, ej. request('/species').
export const API_BASE_URL = `${config.apiUrl}/api/${API_VERSION}`;

// Endpoints globales, sin versión (ej. GET /api/app-config, que la app consulta antes del login).
export const API_GLOBAL_URL = `${config.apiUrl}/api`;

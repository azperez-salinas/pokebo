import { Platform } from 'react-native';
import config from '../config';
import appConfig from '../../app.json';

// Timeout del cliente: el más largo de la cadena (cliente 20 s > Nginx 15 s > Edge→IA 12 s > Edge→Core 10 s).
const REQUEST_TIMEOUT_MS = 20000;

// Cliente HTTP base contra el Edge API. Las requests autenticadas pasan por session.authRequest, que agrega el token.
export async function request(path, options = {}) {
  const { method = 'GET', body, headers = {}, token } = options;
  // Con FormData (multipart) fetch arma el Content-Type con su boundary: no hay que fijarlo ni serializar el body
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        'X-App-Version': appConfig.expo.version,
        'X-App-Platform': Platform.OS,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (cause) {
    const error = new Error(cause?.name === 'AbortError'
      ? 'El servidor tardó demasiado en responder. Probá de nuevo.'
      : 'No se pudo conectar al servidor. Revisá la URL del Edge API y tu conexión.');
    error.code = cause?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('El servidor devolvió una respuesta inválida.');
  }

  if (!response.ok) {
    const error = new Error(data?.detail || data?.message || 'No se pudo completar la solicitud.');
    error.code = data?.code;
    error.status = response.status;
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

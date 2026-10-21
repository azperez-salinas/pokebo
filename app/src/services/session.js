import * as SecureStore from 'expo-secure-store';
import { request } from './api';
import { refresh } from './auth.service';

// Guardado seguro de la sesión: los tokens van SOLO al almacenamiento seguro del sistema operativo
// (Keychain en iOS, Keystore en Android), nunca a AsyncStorage ni a texto plano. No se loguean.
// Las pantallas no usan este módulo directo: pasan por useAuth (store) o por los services.
const KEYS = {
  accessToken: 'pokebo.accessToken',
  refreshToken: 'pokebo.refreshToken',
  user: 'pokebo.user',
};

// Solo accesible con el dispositivo desbloqueado y sin copiarse a backups de otro dispositivo
const STORE_OPTIONS = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

let current = null; // { user, accessToken, refreshToken } en memoria mientras la app está abierta
let refreshing = null; // promesa del refresh en curso: uno solo a la vez aunque fallen varias requests juntas
const listeners = new Set();

function notify() {
  listeners.forEach((listener) => listener(current));
}

// El store se suscribe para enterarse si la sesión termina sola (ej. refresh token revocado)
export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession() {
  return current;
}

export async function saveSession({ user, accessToken, refreshToken }) {
  if (!accessToken || !refreshToken) throw new Error('La respuesta del servidor no trae los tokens de sesión.');
  await SecureStore.setItemAsync(KEYS.accessToken, accessToken, STORE_OPTIONS);
  await SecureStore.setItemAsync(KEYS.refreshToken, refreshToken, STORE_OPTIONS);
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user ?? null), STORE_OPTIONS);
  current = { user: user ?? null, accessToken, refreshToken };
  notify();
  return current;
}

export async function loadSession() {
  try {
    const [accessToken, refreshToken, user] = await Promise.all([
      SecureStore.getItemAsync(KEYS.accessToken, STORE_OPTIONS),
      SecureStore.getItemAsync(KEYS.refreshToken, STORE_OPTIONS),
      SecureStore.getItemAsync(KEYS.user, STORE_OPTIONS),
    ]);
    current = accessToken && refreshToken ? { user: user ? JSON.parse(user) : null, accessToken, refreshToken } : null;
  } catch {
    // Datos corruptos o ilegibles: se arranca sin sesión
    current = null;
  }
  return current;
}

export async function clearSession() {
  current = null;
  await Promise.all(Object.values(KEYS).map((key) => SecureStore.deleteItemAsync(key, STORE_OPTIONS).catch(() => {})));
  notify();
}

// Renueva el access token con el refresh token (que el servidor rota). Si el servidor lo rechaza, la sesión
// se termina; si el problema es de red, se mantiene la sesión y se propaga el error.
async function refreshSession() {
  if (!refreshing) {
    const refreshToken = current?.refreshToken;
    refreshing = (async () => {
      if (!refreshToken) throw Object.assign(new Error('Tu sesión expiró. Iniciá sesión de nuevo.'), { code: 'SESSION_ENDED' });
      try {
        const renewed = await refresh(refreshToken);
        return await saveSession({ user: renewed.user ?? current?.user, ...renewed });
      } catch (error) {
        if (error.status === 401 || error.status === 400) {
          await clearSession();
          throw Object.assign(new Error('Tu sesión expiró. Iniciá sesión de nuevo.'), { code: 'SESSION_ENDED' });
        }
        throw error;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// Request autenticada: ante cualquier 401 se renueva el token UNA sola vez y se reintenta.
// Si el refresh falla, se borran los tokens y el store vuelve al login.
export async function authRequest(path, options = {}) {
  if (!current) throw Object.assign(new Error('Iniciá sesión para continuar.'), { code: 'SESSION_ENDED' });
  try {
    return await request(path, { ...options, token: current.accessToken });
  } catch (error) {
    if (error.status !== 401) throw error;
    const renewed = await refreshSession();
    return request(path, { ...options, token: renewed.accessToken });
  }
}

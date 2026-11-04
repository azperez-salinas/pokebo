// Activar y desactivar los avisos de cercanía: permisos, ajuste en el servidor (settings.nearbyAlerts)
// y arranque o parada de la tarea en segundo plano.
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { startBackgroundLocation, stopBackgroundLocation } from '../tasks/locationTask';
import { updateMe } from './users.service';

const permissionError = (code) => Object.assign(new Error(code), { code });

// Pide los tres permisos en orden. Tira un error con code FOREGROUND_DENIED, BACKGROUND_DENIED o
// NOTIFICATIONS_DENIED si el usuario rechaza alguno. En Android 11 o superior el permiso de segundo plano
// lleva a la pantalla de ajustes del sistema ("Permitir todo el tiempo").
export async function requestNearbyPermissions() {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw permissionError('FOREGROUND_DENIED');

  let background = await Location.getBackgroundPermissionsAsync();
  if (!background.granted) background = await Location.requestBackgroundPermissionsAsync();
  if (!background.granted) throw permissionError('BACKGROUND_DENIED');

  let notifications = await Notifications.getPermissionsAsync();
  if (!notifications.granted) notifications = await Notifications.requestPermissionsAsync();
  if (!notifications.granted) throw permissionError('NOTIFICATIONS_DENIED');
}

// Mismo chequeo sin pedir nada (para retomar los avisos al abrir la app)
async function hasNearbyPermissions() {
  const [foreground, background, notifications] = await Promise.all([
    Location.getForegroundPermissionsAsync(),
    Location.getBackgroundPermissionsAsync(),
    Notifications.getPermissionsAsync(),
  ]);
  return foreground.granted && background.granted && notifications.granted;
}

export async function enableNearbyAlerts() {
  await requestNearbyPermissions();
  await updateMe({ settings: { nearbyAlerts: true } });
  try {
    await startBackgroundLocation();
  } catch (cause) {
    await updateMe({ settings: { nearbyAlerts: false } }).catch(() => {});
    throw cause;
  }
}

// Primero se apaga en el servidor: si falla, la tarea sigue y el ajuste coincide con lo que pasa.
export async function disableNearbyAlerts() {
  await updateMe({ settings: { nearbyAlerts: false } });
  await stopBackgroundLocation();
}

// Deja la tarea como corresponde según la sesión y el ajuste: se llama al abrir la app, al iniciar o cerrar sesión
// y cuando cambia el ajuste.
export async function syncNearbyAlerts({ signedIn, enabled }) {
  if (signedIn && enabled) {
    if (await hasNearbyPermissions()) await startBackgroundLocation();
    return;
  }
  await stopBackgroundLocation();
}

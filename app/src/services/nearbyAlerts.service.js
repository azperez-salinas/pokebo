// Avisos de cercanía en primer plano: permisos, preferencia y comprobación periódica.
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { NEARBY_CHANNEL_ID, stopBackgroundLocation } from '../tasks/locationTask';
import { buildNearbyNotification } from '../utils/nearbyNotification';
import { cellOf } from '../utils/h3';
import { updateMe, updateMyLocation } from './users.service';

const permissionError = (code) => Object.assign(new Error(code), { code });

// Solo se pide ubicación mientras se usa la app y permiso de notificaciones.
export async function requestNearbyPermissions() {
  let foreground = await Location.getForegroundPermissionsAsync();
  if (!foreground.granted) foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) throw permissionError('FOREGROUND_DENIED');

  let notifications = await Notifications.getPermissionsAsync();
  if (!notifications.granted) notifications = await Notifications.requestPermissionsAsync();
  if (!notifications.granted) throw permissionError('NOTIFICATIONS_DENIED');
}

export async function enableNearbyAlerts() {
  await requestNearbyPermissions();
  // El permiso de notificaciones ya fue concedido: activa el aviso local y el push del servidor.
  await updateMe({ settings: { nearbyAlerts: true, pushEnabled: true } });
}

// Primero se apaga en el servidor: si falla, la tarea sigue y el ajuste coincide con lo que pasa.
export async function disableNearbyAlerts() {
  await updateMe({ settings: { nearbyAlerts: false, pushEnabled: false } });
  await stopBackgroundLocation();
}

export async function stopLegacyBackgroundLocation() {
  await stopBackgroundLocation();
}

// Informa H3, recibe sightings nuevos y muestra el aviso local correspondiente.
export async function checkNearbySightings() {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return { nearby: [] };

  const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  const result = await updateMyLocation(cellOf(coords.latitude, coords.longitude));
  const notification = buildNearbyNotification(result?.nearby);
  if (notification) {
    await Notifications.setNotificationChannelAsync(NEARBY_CHANNEL_ID, {
      name: 'Avistamientos cercanos',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.scheduleNotificationAsync({
      content: { ...notification, sound: 'default' },
      trigger: { channelId: NEARBY_CHANNEL_ID },
    });
  }
  return result;
}

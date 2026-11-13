import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

import { authRequest, getSession } from './session';
import { NEARBY_CHANNEL_ID } from '../tasks/locationTask';

const registered = new Set();
const pending = new Map();

export async function registerDevicePushToken(userId) {
  // No registrar dispositivos sin una sesión válida.
  if (!userId || getSession()?.user?._id !== userId) {
    return { status: 'no-session' };
  }

  // Expo Go en Android no soporta push remoto.
  if (
    Platform.OS === 'android' &&
    (Constants.executionEnvironment === 'storeClient' ||
      Constants.executionEnvironment === 'expo')
  ) {
    return { status: 'unsupported' };
  }

  if (!['android', 'ios'].includes(Platform.OS)) {
    return { status: 'unsupported' };
  }

  // No solicitar permisos automáticamente.
  const permissions = await Notifications.getPermissionsAsync();

  if (!permissions.granted) {
    return { status: 'permission-denied' };
  }

  // Evitar solicitudes simultáneas del mismo usuario.
  if (pending.has(userId)) {
    return pending.get(userId);
  }

  const task = (async () => {
    // Token nativo FCM (Android) o APNs (iOS).

    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(
            NEARBY_CHANNEL_ID,
            {
            name: 'Avistamientos cercanos',
            importance: Notifications.AndroidImportance.DEFAULT,
            }
        );
    }

    const result = await Notifications.getDevicePushTokenAsync();

    const token = result?.data;

    if (typeof token !== 'string' || !token.trim()) {
      throw new Error('No se obtuvo un token push válido.');
    }

    // Confirmar que la sesión no cambió mientras se obtenía.
    if (getSession()?.user?._id !== userId) {
      return { status: 'no-session' };
    }

    const key = JSON.stringify([userId, Platform.OS, token]);

    if (registered.has(key)) {
      return { status: 'already-registered' };
    }

    await authRequest('/users/me/push-token', {
      method: 'PUT',
      body: {
        token,
        platform: Platform.OS,
      },
    });

    registered.add(key);

    return { status: 'registered' };
  })();

  pending.set(userId, task);

  try {
    return await task;
  } finally {
    pending.delete(userId);
  }
}
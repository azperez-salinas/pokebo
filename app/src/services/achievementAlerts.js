import * as Notifications from 'expo-notifications';
import { buildAchievementNotification } from '../utils/achievementNotification';

export const ACHIEVEMENTS_CHANNEL_ID = 'achievements';

// Notificación del teléfono por los logros de una captura. Si no hay permiso o falla, no pasa nada:
// el logro igual se ve en el resultado de la captura y en el buzón.
export async function notifyUnlockedAchievements(unlocked) {
  const notification = buildAchievementNotification(unlocked);
  if (!notification) return;
  try {
    await Notifications.setNotificationChannelAsync(ACHIEVEMENTS_CHANNEL_ID, {
      name: 'Logros',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.scheduleNotificationAsync({
      content: { ...notification, sound: 'default' },
      trigger: { channelId: ACHIEVEMENTS_CHANNEL_ID },
    });
  } catch (cause) {
    console.warn('[achievementAlerts]', cause?.message);
  }
}

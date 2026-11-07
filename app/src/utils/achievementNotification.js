// Texto de la notificación del teléfono cuando una captura desbloquea logros.
// unlocked: [{ code, name }] (lo que devuelve POST /captures en unlockedAchievements). null si no hay nada que avisar.
export const ACHIEVEMENT_NOTIFICATION_TYPE = 'achievement';

export function buildAchievementNotification(unlocked) {
  if (!Array.isArray(unlocked) || unlocked.length === 0) return null;
  const data = { type: ACHIEVEMENT_NOTIFICATION_TYPE, codes: unlocked.map((achievement) => achievement.code) };

  if (unlocked.length === 1) {
    return { title: '¡Logro desbloqueado!', body: unlocked[0].name, data };
  }
  return { title: `¡${unlocked.length} logros desbloqueados!`, body: unlocked.map((achievement) => achievement.name).join(', '), data };
}

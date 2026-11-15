// Texto de la notificación del teléfono cuando una captura desbloquea logros.
// unlocked: [{ code, name }] (lo que devuelve POST /captures en unlockedAchievements). null si no hay nada que avisar.
export const ACHIEVEMENT_NOTIFICATION_TYPE = 'achievement';
// Android muestra el aviso en una sola línea hasta que se expande: como mucho dos nombres y "y N más".
const MAX_NAMES = 2;

export function buildAchievementNotification(unlocked) {
  if (!Array.isArray(unlocked) || unlocked.length === 0) return null;
  const data = { type: ACHIEVEMENT_NOTIFICATION_TYPE, codes: unlocked.map((achievement) => achievement.code) };

  if (unlocked.length === 1) {
    return { title: '¡Logro desbloqueado!', body: unlocked[0].name, data };
  }
  return { title: `¡${unlocked.length} logros desbloqueados!`, body: summarize(unlocked.map((achievement) => achievement.name)), data };
}

function summarize(names) {
  const shown = names.slice(0, MAX_NAMES).join(', ');
  const rest = names.length - MAX_NAMES;
  return rest > 0 ? `${shown} y ${rest} más` : shown;
}

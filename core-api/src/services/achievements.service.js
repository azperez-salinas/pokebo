// Logros y progreso del usuario. El progreso se calcula siempre desde las capturas (no se acumula a mano),
// así que se puede recalcular en cualquier momento y los usuarios con capturas anteriores quedan al día.
const Achievement = require('../models/Achievement.model');
const UserAchievement = require('../models/UserAchievement.model');
const Capture = require('../models/Capture.model');
const Species = require('../models/Species.model');
const notificationsService = require('./notifications.service');
const { ACHIEVEMENTS, GROUPS } = require('../data/achievements.catalog');

// Crea o actualiza los logros del catálogo (idempotente, por code). Se llama al iniciar el Core.
async function syncCatalog() {
  await Achievement.bulkWrite(
    ACHIEVEMENTS.map((achievement, index) => ({
      updateOne: {
        filter: { code: achievement.code },
        update: { $set: { ...achievement, order: index } },
        upsert: true,
      },
    })),
  );
}

// ¿Esta especie cuenta para el filtro del logro?
function matchesFilter(species, filter = {}) {
  if (filter.class && species.class !== filter.class) return false;
  if (filter.family && species.family !== filter.family) return false;
  if (filter.families && !filter.families.includes(species.family)) return false;
  if (filter.category && species.category !== filter.category) return false;
  return true;
}

function progressOf(achievement, { totalCaptures, capturedSpecies }) {
  const { type, filter, threshold } = achievement.criteria;
  const value = type === 'total_captures'
    ? totalCaptures
    : capturedSpecies.filter((species) => matchesFilter(species, filter)).length;
  return Math.min(value, threshold);
}

const toPublicAchievement = (achievement, userAchievement) => ({
  id: achievement._id,
  code: achievement.code,
  name: achievement.name,
  description: achievement.description,
  icon: achievement.icon,
  group: achievement.group,
  threshold: achievement.criteria.threshold,
  progress: userAchievement?.progress ?? 0,
  unlocked: Boolean(userAchievement?.unlockedAt),
  unlockedAt: userAchievement?.unlockedAt ?? null,
});

// Guarda el progreso (nunca baja) y desbloquea los logros que llegaron al umbral. Devuelve los recién desbloqueados.
// Se puede llamar las veces que sea: un logro se desbloquea una sola vez aunque haya dos llamadas en paralelo.
async function sync(userId, { captureId } = {}) {
  const [achievements, existing, totalCaptures, speciesIds] = await Promise.all([
    Achievement.find().sort({ order: 1 }).lean(),
    UserAchievement.find({ user: userId }).lean(),
    Capture.countDocuments({ user: userId }),
    Capture.distinct('species', { user: userId }),
  ]);
  const capturedSpecies = speciesIds.length
    ? await Species.find({ _id: { $in: speciesIds } }).select('class family category').lean()
    : [];
  const byAchievement = new Map(existing.map((item) => [String(item.achievement), item]));

  const items = [];
  const unlocked = [];
  for (const achievement of achievements) {
    let current = byAchievement.get(String(achievement._id));
    const progress = progressOf(achievement, { totalCaptures, capturedSpecies });

    if (!current || progress > current.progress) {
      current = await UserAchievement.findOneAndUpdate(
        { user: userId, achievement: achievement._id },
        { $max: { progress } },
        { upsert: true, new: true },
      ).lean();
    }

    if (progress >= achievement.criteria.threshold && !current.unlockedAt) {
      // Solo una llamada ve la transición: la que encuentra unlockedAt sin definir
      const transitioned = await UserAchievement.findOneAndUpdate(
        { user: userId, achievement: achievement._id, unlockedAt: { $exists: false } },
        { $set: { unlockedAt: new Date(), ...(captureId ? { capture: captureId } : {}) } },
        { new: true },
      ).lean();
      if (transitioned) {
        current = transitioned;
        unlocked.push(toPublicAchievement(achievement, transitioned));
      }
    }
    items.push(toPublicAchievement(achievement, current));
  }

  for (const achievement of unlocked) {
    await notificationsService.createSafe(userId, {
      type: 'achievement',
      title: '¡Logro desbloqueado!',
      body: achievement.name,
      data: { achievementId: achievement.id, code: achievement.code },
    });
  }
  return { items, unlocked };
}

// Pantalla de logros: todos los logros con el progreso del usuario, ya agrupados.
async function listForUser(userId) {
  const { items } = await sync(userId);
  return {
    groups: GROUPS.map((group) => ({ ...group, achievements: items.filter((item) => item.group === group.id) }))
      .filter((group) => group.achievements.length > 0),
    summary: { unlocked: items.filter((item) => item.unlocked).length, total: items.length },
  };
}

// Después de una captura: devuelve los logros que se desbloquearon con ella. Si falla no rompe la captura.
async function evaluate(userId, capture) {
  try {
    const { unlocked } = await sync(userId, { captureId: capture?._id });
    return unlocked;
  } catch (cause) {
    console.warn('[achievements] no se pudieron evaluar:', cause.message);
    return [];
  }
}

module.exports = { syncCatalog, sync, listForUser, evaluate, matchesFilter };

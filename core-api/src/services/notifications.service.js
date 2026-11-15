// Buzón de notificaciones del usuario (el aviso del teléfono lo muestra la app; acá queda el historial).
const Notification = require('../models/Notification.model');
const { AppError } = require('../utils/errors');

const toPublicNotification = (notification) => ({
  id: notification._id,
  type: notification.type,
  title: notification.title,
  body: notification.body,
  data: notification.data,
  read: notification.read,
  createdAt: notification.createdAt,
});

// Más recientes primero. before = createdAt de la última recibida (para pedir la página siguiente).
async function listForUser(userId, { type, limit = 30, before } = {}) {
  const filter = { user: userId };
  if (type) filter.type = type;
  if (before) filter.createdAt = { $lt: before };

  const [items, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ user: userId, read: false }),
  ]);

  return {
    notifications: items.map(toPublicNotification),
    unreadCount,
    nextBefore: items.length === limit ? items[items.length - 1].createdAt : null,
  };
}

async function create(userId, { type, title, body, data }) {
  const notification = await Notification.create({ user: userId, type, title, body, data, sentAt: new Date() });
  return toPublicNotification(notification);
}

// Los servicios que generan avisos no deben fallar por el buzón: si no se pudo guardar, se loguea y sigue.
async function createSafe(userId, payload) {
  try {
    return await create(userId, payload);
  } catch (cause) {
    console.warn('[notifications] no se pudo guardar:', cause.message);
    return null;
  }
}

async function markRead(userId, notificationId) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, user: userId },
    { $set: { read: true } },
    { new: true },
  ).lean();
  if (!notification) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notificación no encontrada');
  return toPublicNotification(notification);
}

async function markAllRead(userId, { type } = {}) {
  const filter = { user: userId, read: false };
  if (type) filter.type = type;
  const result = await Notification.updateMany(filter, { $set: { read: true } });
  return { updated: result.modifiedCount };
}

module.exports = { listForUser, create, createSafe, markRead, markAllRead, toPublicNotification };

const notificationsService = require('../services/notifications.service');

async function list(req, res, next) {
  try {
    res.status(200).json(await notificationsService.listForUser(req.user.id, req.query));
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await notificationsService.markRead(req.user.id, req.params.id);
    res.status(200).json({ notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    res.status(200).json(await notificationsService.markAllRead(req.user.id, req.query));
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead };

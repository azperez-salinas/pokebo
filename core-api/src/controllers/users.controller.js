const usersService = require('../services/users.service');

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

async function getMe(req, res, next) {
  try {
    const user = await usersService.getById(req.user.id);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function updateMe(req, res, next) {
  try {
    const user = await usersService.updateMe(req.user.id, req.body);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
}

async function registerPushToken(req, res, next) {
  try {
    await usersService.registerPushToken(req.user.id, req.body.token, req.body.platform);
    res.status(200).json({ message: 'Push token registrado' });
  } catch (err) {
    next(err);
  }
}

async function deleteMe(req, res, next) {
  try {
    await usersService.deleteMe(req.user.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getMe,
  updateMe,
  updateMyLocation: notImplemented,
  registerPushToken,
  deleteMe,
};

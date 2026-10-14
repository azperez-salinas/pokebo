const authService = require('../services/auth.service');

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

// Los AppError del service (ej. 409 USERNAME_TAKEN) los traduce error.middleware
async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    await authService.changePassword(req.user.id, req.body.currentPassword, req.body.newPassword);
    res.status(200).json({ message: 'Contraseña actualizada' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  changePassword,
  refresh: notImplemented,
};

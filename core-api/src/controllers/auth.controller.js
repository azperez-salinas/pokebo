const authService = require('../services/auth.service');
const registrationService = require('../services/registration.service');

// Los AppError del service (ej. 409 USERNAME_TAKEN) los traduce error.middleware
async function startRegistration(req, res, next) {
  try {
    const result = await registrationService.start(req.body);
    res.status(202).json(result);
  } catch (err) {
    next(err);
  }
}

async function verifyRegistration(req, res, next) {
  try {
    const result = await registrationService.verify(req.body.challengeId, req.body.code);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

async function resendRegistration(req, res, next) {
  try {
    const result = await registrationService.resend(req.body.challengeId);
    res.status(202).json(result);
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

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(200).json({ message: 'Sesión cerrada' });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body.usernameOrEmail);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { usernameOrEmail, code, newPassword } = req.body;
    const result = await authService.resetPassword(usernameOrEmail, code, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  startRegistration,
  verifyRegistration,
  resendRegistration,
  login,
  changePassword,
  refresh,
  forgotPassword,
  resetPassword,
  logout
};

const authService = require('../services/auth.service');
const registrationService = require('../services/registration.service');
const loginVerificationService = require('../services/login-verification.service');
const otpEmailPublisher = require('../services/otp-email-publisher.service');
const config = require('../config');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function respondWithOtpDelivery(result, status, startedAt, res) {
  if (result.delivery) {
    try {
      await otpEmailPublisher.enqueue(result.delivery);
    } catch (error) {
      // La respuesta pública no revela si la cuenta existe ni si SQS aceptó el mensaje.
      // No incluir correo, código, challengeId ni payloads del SDK en este log.
      console.error('No se pudo encolar el correo OTP', {
        purpose: result.delivery.purpose,
        error: error?.name || 'Error',
      });
    }
  }

  const remainingDelay = config.otpResponseMinMs - (Date.now() - startedAt);
  if (remainingDelay > 0) await wait(remainingDelay);
  return res.status(status).json(result.public);
}

// Los AppError del service (ej. 409 USERNAME_TAKEN) los traduce error.middleware
async function startRegistration(req, res, next) {
  const startedAt = Date.now();
  try {
    const result = await registrationService.start(req.body);
    return await respondWithOtpDelivery(result, 202, startedAt, res);
  } catch (err) {
    return next(err);
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
  const startedAt = Date.now();
  try {
    const result = await registrationService.resend(req.body.challengeId);
    return await respondWithOtpDelivery(result, 202, startedAt, res);
  } catch (err) {
    return next(err);
  }
}

async function login(req, res, next) {
  const startedAt = Date.now();
  try {
    const result = await loginVerificationService.start(req.body);
    return await respondWithOtpDelivery(result, 202, startedAt, res);
  } catch (err) {
    return next(err);
  }
}

async function verifyLogin(req, res, next) {
  try {
    const result = await loginVerificationService.verify(req.body.challengeId, req.body.code);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function resendLogin(req, res, next) {
  const startedAt = Date.now();
  try {
    const result = await loginVerificationService.resend(req.body.challengeId);
    return await respondWithOtpDelivery(result, 202, startedAt, res);
  } catch (err) {
    return next(err);
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
  const startedAt = Date.now();
  try {
    const result = await authService.forgotPassword(req.body.usernameOrEmail);
    return await respondWithOtpDelivery(result, 200, startedAt, res);
  } catch (err) {
    return next(err);
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
  verifyLogin,
  resendLogin,
  changePassword,
  refresh,
  forgotPassword,
  resetPassword,
  logout
};

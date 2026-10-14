// Registro, login y emisión de JWT (firmados con JWT_PRIVATE_KEY).
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');
const { redisClient } = require('../config/redis');
const User = require('../models/User.model');
const mailService = require('./mail.service');
const { AppError } = require('../utils/errors');
const {
  issueTokens,
  verifyToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllRefreshTokens,
} = require('./token.service');

const BCRYPT_ROUNDS = 10;

const usernameTaken = () => new AppError(409, 'USERNAME_TAKEN', 'El nombre de usuario ya está en uso');
const emailTaken = () => new AppError(409, 'EMAIL_TAKEN', 'El email ya está en uso');

// Devuelve el usuario sin passwordHash
function toPublicUser(user) {
  const { passwordHash, __v, ...rest } = user.toObject();
  return rest;
}

async function register(data) {
  const { password, ...fields } = data;

  if (await User.exists({ username: fields.username })) {
    throw usernameTaken();
  }
  if (await User.exists({ email: fields.email.toLowerCase() })) {
    throw emailTaken();
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await User.create({ ...fields, passwordHash });
  } catch (err) {
    // Dos registros simultáneos con el mismo username o email: lo frena el índice unique
    if (err.code === 11000) {
      const campo = Object.keys(err.keyPattern || err.keyValue || {})[0];
      if (campo === 'username') throw usernameTaken();
      if (campo === 'email') throw emailTaken();
    }
    throw err;
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
}

// Hash de relleno: si el username no existe igual se corre bcrypt, para no revelar por tiempo de respuesta
const DUMMY_HASH = bcrypt.hashSync('pokebo-dummy-password', BCRYPT_ROUNDS);

async function login(credentials) {
  const { username, password } = credentials;
  const user = await User.findOne({ username });

  // Mismo error si no existe el usuario o si la contraseña está mal
  const valid = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  }

  if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
    throw new AppError(401, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual es incorrecta');
  }

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();

  // Las sesiones abiertas con la contraseña vieja dejan de poder renovarse
  await revokeAllRefreshTokens(user._id);
}

// Mismo error para token inválido, vencido, ya usado o revocado: no se da pista del motivo
const invalidRefreshToken = () => new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token inválido o expirado');

async function refresh(refreshToken) {
  let payload;
  try {
    payload = verifyToken(refreshToken);
  } catch (err) {
    throw invalidRefreshToken();
  }
  if (payload.type !== 'refresh') {
    throw invalidRefreshToken();
  }

  if (!(await findRefreshToken(payload.sub, payload.jti))) {
    throw invalidRefreshToken();
  }

  const user = await User.findById(payload.sub);
  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  }

  // Rotación: el refresh usado se invalida. Si DEL no borró nada, otra request lo usó en paralelo.
  if (!(await revokeRefreshToken(payload.sub, payload.jti))) {
    throw invalidRefreshToken();
  }

  const tokens = await issueTokens(user);
  return { user: toPublicUser(user), ...tokens };
}

// --- Recuperación de contraseña ("olvidé mi contraseña") ---
// Código de 6 dígitos por mail. En Redis se guarda solo su sha256, en el hash pwreset:<userId>
// con los campos { hash, attempts } y TTL de 15 minutos.
const MAX_RESET_ATTEMPTS = 5;
const resetKey = (userId) => `pwreset:${userId}`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const invalidResetCode = () => new AppError(401, 'INVALID_RESET_CODE', 'Código inválido o expirado');

function findByUsernameOrEmail(usernameOrEmail) {
  return User.findOne({ $or: [{ username: usernameOrEmail }, { email: usernameOrEmail.toLowerCase() }] });
}

async function forgotPassword(usernameOrEmail) {
  const user = await findByUsernameOrEmail(usernameOrEmail);

  // Exista o no la cuenta, la respuesta es la misma
  if (user && user.email) {
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const key = resetKey(user._id);
    // Pedir un código nuevo reemplaza al anterior y reinicia los intentos
    await redisClient
      .multi()
      .del(key)
      .hSet(key, { hash: sha256(code), attempts: 0 })
      .expire(key, config.passwordResetTtl)
      .exec();
    await mailService.sendPasswordResetCode(user.email, code);
  }

  return { message: 'Si la cuenta existe, se envió un código al mail asociado' };
}

async function resetPassword(usernameOrEmail, code, newPassword) {
  const user = await findByUsernameOrEmail(usernameOrEmail);
  if (!user) throw invalidResetCode();

  const key = resetKey(user._id);
  const pending = await redisClient.hGetAll(key);
  if (!pending || !pending.hash) throw invalidResetCode();

  const expected = Buffer.from(pending.hash, 'hex');
  const received = Buffer.from(sha256(code), 'hex');
  if (!crypto.timingSafeEqual(received, expected)) {
    // HINCRBY es atómico: intentos en paralelo no pueden pasarse del límite
    const attempts = await redisClient.hIncrBy(key, 'attempts', 1);
    if (attempts >= MAX_RESET_ATTEMPTS) await redisClient.del(key);
    throw invalidResetCode();
  }

  // El código es de un solo uso: si DEL no borró nada, otra request ya lo usó
  if (!(await redisClient.del(key))) throw invalidResetCode();

  user.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.save();
  await revokeAllRefreshTokens(user._id);

  return { message: 'Contraseña actualizada' };
}

module.exports = { register, login, changePassword, refresh, forgotPassword, resetPassword };

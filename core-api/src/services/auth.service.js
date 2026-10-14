// Registro, login y emisión de JWT (firmados con JWT_PRIVATE_KEY).
const bcrypt = require('bcrypt');
const User = require('../models/User.model');
const { AppError } = require('../utils/errors');
const { issueTokens } = require('./token.service');

const BCRYPT_ROUNDS = 10;

const usernameTaken = () => new AppError(409, 'USERNAME_TAKEN', 'El nombre de usuario ya está en uso');

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user;
  try {
    user = await User.create({ ...fields, passwordHash });
  } catch (err) {
    // Dos registros simultáneos con el mismo username: lo frena el índice unique
    if (err.code === 11000 && err.keyPattern && err.keyPattern.username) {
      throw usernameTaken();
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
}

async function refresh(refreshToken) {
  // TODO
  throw new Error('not implemented');
}

module.exports = { register, login, changePassword, refresh };

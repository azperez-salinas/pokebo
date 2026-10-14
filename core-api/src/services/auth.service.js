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

async function login(credentials) {
  // TODO
  throw new Error('not implemented');
}

async function refresh(refreshToken) {
  // TODO
  throw new Error('not implemented');
}

module.exports = { register, login, refresh };

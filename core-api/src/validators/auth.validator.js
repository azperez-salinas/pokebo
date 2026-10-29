const Joi = require('joi');
const { AVATARS } = require('../models/User.model');

const PASSWORD_MIN_LENGTH = 8;

const username = Joi.string().trim().required();

const register = Joi.object({
  username,
  email: Joi.string().email().required(),
  avatar: Joi.string().valid(...AVATARS),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
});

// Solo credenciales: cualquier otro campo se descarta
const login = Joi.object({
  username,
  password: Joi.string().required(),
});

const changePassword = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const forgotPassword = Joi.object({
  usernameOrEmail: Joi.string().required(),
});

const resetPassword = Joi.object({
  usernameOrEmail: Joi.string().required(),
  code: Joi.string().length(6).pattern(/^[0-9]+$/).required(),
  newPassword: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
});

const logout = Joi.object({
  refreshToken: Joi.string().required(),
});

module.exports = { username, register, login, changePassword, refresh, forgotPassword, resetPassword, logout};

const Joi = require('joi');
const { AVATARS, BIO_MAX_LENGTH } = require('../models/User.model');

const PASSWORD_MIN_LENGTH = 8;

const register = Joi.object({
  fullname: Joi.string().trim().required(),
  username: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  dateOfBirth: Joi.date().iso().max('now').required(),
  bio: Joi.string().trim().allow('').max(BIO_MAX_LENGTH),
  avatar: Joi.string().valid(...AVATARS),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
});

// Solo credenciales: cualquier otro campo se descarta
const login = Joi.object({
  username: Joi.string().trim().required(),
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

module.exports = { register, login, changePassword, refresh, forgotPassword, resetPassword };

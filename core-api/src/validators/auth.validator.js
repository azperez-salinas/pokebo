const Joi = require('joi');
const { AVATARS, BIO_MAX_LENGTH } = require('../models/User.model');

const PASSWORD_MIN_LENGTH = 8;

const register = Joi.object({
  fullname: Joi.string().trim().required(),
  username: Joi.string().trim().required(),
  dateOfBirth: Joi.date().iso().max('now').required(),
  bio: Joi.string().trim().allow('').max(BIO_MAX_LENGTH),
  avatar: Joi.string().valid(...AVATARS),
  password: Joi.string().min(PASSWORD_MIN_LENGTH).required(),
});

// TODO: definir schemas con la librería de validación elegida.
const login = {};
const refresh = {};

module.exports = { register, login, refresh };

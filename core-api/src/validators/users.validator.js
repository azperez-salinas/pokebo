const Joi = require('joi');
const { AVATARS } = require('../models/User.model');
const { username } = require ('./auth.validator');

// el validate descarta cualquier otro campo (stripUnknown) y min(1) rechaza el body que quede vacío.
const updateMe = Joi.object({
  username: username.optional(),
  bio: Joi.string().allow('').max(150),
  avatar: Joi.string().valid(...AVATARS),
  settings: Joi.object({
    pushEnabled: Joi.boolean(),
    nearbyAlerts: Joi.boolean(),
  }).min(1),
}).min(1);

const pushToken = Joi.object({
  token: Joi.string().trim().required(),
  platform: Joi.string().valid('ios', 'android').required(),
});

// El cliente informa solo la celda H3 (resolución 11), nunca sus coordenadas exactas.
const location = Joi.object({
  h3Index: Joi.string().pattern(/^[0-9a-f]{15}$/).required(),
});

module.exports = { updateMe, pushToken, location };

const Joi = require('joi');
const { AVATARS } = require('../models/User.model');

// el validate descarta cualquier otro campo (stripUnknown) y min(1) rechaza el body que quede vacío.
const updateMe = Joi.object({
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

module.exports = { updateMe, pushToken };
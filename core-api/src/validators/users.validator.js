const Joi = require('joi');
const { AVATARS, BIO_MAX_LENGTH } = require('../models/User.model');

// Solo se editan estos campos. username, email y dateOfBirth no se modifican por acá:
// el validate descarta cualquier otro campo (stripUnknown) y min(1) rechaza el body que quede vacío.
const updateMe = Joi.object({
  fullname: Joi.string().trim().min(1),
  bio: Joi.string().trim().allow('').max(BIO_MAX_LENGTH),
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
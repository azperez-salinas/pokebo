const Joi = require('joi');
const { objectId } = require('./common.validator');

const TYPES = ['achievement', 'nearby', 'capture'];

// GET /notifications: filtro por tipo y paginación por fecha (before = createdAt de la última recibida)
const list = {
  query: Joi.object({
    type: Joi.string().valid(...TYPES),
    limit: Joi.number().integer().min(1).max(100).default(30),
    before: Joi.date().iso(),
  }),
};

const markRead = {
  params: Joi.object({ id: objectId.required() }),
};

const markAllRead = {
  query: Joi.object({ type: Joi.string().valid(...TYPES) }),
};

module.exports = { list, markRead, markAllRead };

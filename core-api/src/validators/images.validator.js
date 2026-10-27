const Joi = require('joi');
const { objectId } = require('./common.validator');

const getById = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = { getById };

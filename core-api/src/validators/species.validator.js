const Joi = require('joi');
const { objectId } = require('./common.validator');

// TODO: definir los filtros de query cuando se diseñe el listado.
// Ojo: apenas se declare un schema para `query`, todo parámetro no declarado se descarta.
const list = {};

const getById = {
  params: Joi.object({ id: objectId.required() }),
};

module.exports = { list, getById };
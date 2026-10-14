const Joi = require('joi');
const { AppError } = require('../utils/errors');

// Middleware genérico de validación: recibe un schema Joi de /validators y lo aplica sobre req.body.
// Los validators que todavía no tienen schema (objetos vacíos) dejan pasar todo.
function validate(schema) {
  if (!Joi.isSchema(schema)) {
    return (req, res, next) => next();
  }
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return next(new AppError(400, 'VALIDATION_ERROR', error.details.map((d) => d.message).join('; ')));
    }
    req.body = value;
    return next();
  };
}

module.exports = validate;

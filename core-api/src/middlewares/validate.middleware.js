const Joi = require("joi");
const { AppError } = require("../utils/errors");

// Partes de la request que se pueden validar. Se validan en este orden.
const TARGETS = ["params", "query", "body"];

// Middleware genérico de validación. Acepta dos formas:
//   validate(schema)                         -> atajo: valida solo req.body
//   validate({ params, query, body })        -> valida cada parte con su propio schema Joi
// Las partes sin schema (y los placeholders `{}` de los validators todavía sin definir) se dejan pasar.
function validate(schemas) {
  const byTarget = Joi.isSchema(schemas) ? { body: schemas } : schemas || {};
  const active = TARGETS.filter((target) => Joi.isSchema(byTarget[target]));

  if (active.length === 0) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    const messages = [];

    for (const target of active) {
      const { error, value } = byTarget[target].validate(req[target], {
        abortEarly: false,
        stripUnknown: true,
      });
      if (error) {
        messages.push(...error.details.map((d) => d.message));
      } else {
        req[target] = value; // se reemplaza por la versión limpia (sin campos extra, con tipos convertidos)
      }
    }

    if (messages.length > 0) {
      return next(new AppError(400, "VALIDATION_ERROR", messages.join("; ")));
    }
    return next();
  };
}

module.exports = validate;

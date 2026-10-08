// Middleware genérico de validación: recibe un schema de /validators.
// TODO: elegir librería de validación (Joi, Zod, express-validator) y aplicar el schema
// sobre req.body / req.params / req.query. Por ahora deja pasar todo.
function validate(schema) {
  return (req, res, next) => next();
}

module.exports = validate;

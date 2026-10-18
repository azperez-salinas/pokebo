const Joi = require('joi');

// Un ObjectId de Mongo son 24 caracteres hexadecimales. Validarlo acá evita que un id mal formado
// llegue a Mongoose y explote como CastError (que terminaría en un 500).
const objectId = Joi.string().hex().length(24);

module.exports = { objectId };
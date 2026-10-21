const { AppError } = require('../utils/errors');

// Errores que lanza el propio parser de JSON de Express (antes de llegar a ningún controller).
// Se reconocen por su campo `type`. Se responde con un mensaje fijo y no con err.message,
// que trae detalles internos del parser.
const BODY_PARSER_ERRORS = {
  'entity.parse.failed': { status: 400, code: 'INVALID_JSON', message: 'El body no es un JSON válido' },
  'entity.too.large': { status: 413, code: 'PAYLOAD_TOO_LARGE', message: 'El body supera el tamaño máximo permitido' },
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }

  const parserError = BODY_PARSER_ERRORS[err.type];
  if (parserError) {
    return res.status(parserError.status).json({ code: parserError.code, message: parserError.message });
  }

  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}

module.exports = errorHandler;
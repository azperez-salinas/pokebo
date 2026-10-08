const { AppError } = require('../utils/errors');

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }
  console.error(err);
  return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Internal server error' });
}

module.exports = errorHandler;

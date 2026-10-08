// TODO: aplicar rate limiting (por usuario autenticado o por IP).
function rateLimit(req, res, next) {
  next();
}

module.exports = rateLimit;

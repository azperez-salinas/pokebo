// Verifica que la request venga del Edge API.
// El Edge firma con HMAC-SHA256(SERVICE_SHARED_SECRET, "<timestamp>.<METHOD>.<originalUrl>.<body crudo>")
// y manda X-Service-Timestamp y X-Service-Signature (hex). Acá se recalcula y se compara.
const crypto = require('crypto');
const config = require('../config');
const { AppError } = require('../utils/errors');

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function serviceAuth(req, res, next) {
  // Ya se verificó en esta request (está montado global en app.js y también por ruta)
  if (req.serviceAuthenticated) return next();

  const unauthorized = () => next(new AppError(401, 'INVALID_SERVICE_SIGNATURE', 'Request no firmada por el Edge'));

  const timestamp = req.get('X-Service-Timestamp');
  const signature = req.get('X-Service-Signature');
  if (!config.serviceSharedSecret || !timestamp || !signature) return unauthorized();

  if (Math.abs(Date.now() - Number(timestamp)) > MAX_CLOCK_SKEW_MS) return unauthorized();

  const body = req.rawBody ? req.rawBody.toString('utf8') : '';
  const expected = crypto
    .createHmac('sha256', config.serviceSharedSecret)
    .update(`${timestamp}.${req.method}.${req.originalUrl}.${body}`)
    .digest();
  const received = Buffer.from(signature, 'hex');

  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    return unauthorized();
  }

  req.serviceAuthenticated = true;
  return next();
}

module.exports = serviceAuth;

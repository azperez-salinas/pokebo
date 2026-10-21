// Reenvía una request al Core API firmada con HMAC.
// Firma: HMAC-SHA256(SERVICE_SHARED_SECRET, "<timestamp>.<METHOD>.<path>.<body>") en X-Service-Signature (hex),
// con el timestamp (ms) en X-Service-Timestamp. El Core recalcula y compara (serviceAuth.middleware).
const crypto = require('crypto');
const config = require('../config');
const { AppError } = require('../utils/errors');

// Headers del cliente que se propagan al Core
const HEADERS_PROPAGADOS = ['authorization', 'x-app-version', 'accept-language'];

function firmar(timestamp, metodo, path, body) {
  return crypto
    .createHmac('sha256', config.serviceSharedSecret)
    .update(`${timestamp}.${metodo}.${path}.${body}`)
    .digest('hex');
}

async function reenviarACore(path, metodo, body, headers = {}) {
  const method = metodo.toUpperCase();
  const tieneBody = !['GET', 'HEAD'].includes(method) && body !== undefined;
  const bodyCrudo = tieneBody ? JSON.stringify(body) : '';
  const timestamp = String(Date.now());

  const outHeaders = {
    'X-Service-Timestamp': timestamp,
    'X-Service-Signature': firmar(timestamp, method, path, bodyCrudo),
  };
  for (const nombre of HEADERS_PROPAGADOS) {
    if (headers[nombre]) outHeaders[nombre] = headers[nombre];
  }
  if (tieneBody) outHeaders['Content-Type'] = 'application/json';

  let respuesta;
  try {
    respuesta = await fetch(config.coreApiUrl + path, {
      method,
      headers: outHeaders,
      body: tieneBody ? bodyCrudo : undefined,
    });
  } catch (err) {
    throw new AppError(502, 'CORE_UNAVAILABLE', 'No se pudo contactar al Core API');
  }

  const texto = await respuesta.text();
  let data = null;
  if (texto) {
    try {
      data = JSON.parse(texto);
    } catch {
      data = { message: texto };
    }
  }
  return { status: respuesta.status, data };
}

// Handler de Express: reenvía la request tal cual (mismo método, path y body) y devuelve la respuesta del Core
function forward(req, res, next) {
  reenviarACore(req.originalUrl, req.method, req.body, req.headers)
    .then(({ status, data }) => (data === null ? res.status(status).end() : res.status(status).json(data)))
    .catch(next);
}

module.exports = { reenviarACore, forward };

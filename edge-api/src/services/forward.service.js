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

// Headers firmados hacia el Core: firma HMAC + los headers del cliente que se propagan
function headersFirmados(method, path, bodyCrudo, headers) {
  const timestamp = String(Date.now());
  const outHeaders = {
    'X-Service-Timestamp': timestamp,
    'X-Service-Signature': firmar(timestamp, method, path, bodyCrudo),
  };
  for (const nombre of HEADERS_PROPAGADOS) {
    if (headers[nombre]) outHeaders[nombre] = headers[nombre];
  }
  return outHeaders;
}

async function reenviarACore(path, metodo, body, headers = {}) {
  const method = metodo.toUpperCase();
  const tieneBody = !['GET', 'HEAD'].includes(method) && body !== undefined;
  const bodyCrudo = tieneBody ? JSON.stringify(body) : '';

  const outHeaders = headersFirmados(method, path, bodyCrudo, headers);
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

// Handler de Express para GET de imágenes: el Core responde el binario y se devuelve tal cual con su Content-Type.
// Si el Core responde un error (JSON), se devuelve el error igual que en forward.
async function forwardImagen(req, res, next) {
  try {
    const outHeaders = headersFirmados('GET', req.originalUrl, '', req.headers);

    let respuesta;
    try {
      respuesta = await fetch(config.coreApiUrl + req.originalUrl, { method: 'GET', headers: outHeaders });
    } catch (err) {
      throw new AppError(502, 'CORE_UNAVAILABLE', 'No se pudo contactar al Core API');
    }

    const contentType = respuesta.headers.get('content-type') || '';
    if (!respuesta.ok || !contentType.startsWith('image/')) {
      const texto = await respuesta.text();
      let data = null;
      try {
        data = JSON.parse(texto);
      } catch {
        data = { message: texto };
      }
      return res.status(respuesta.ok ? 502 : respuesta.status).json(data);
    }

    res.status(200).set({
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': respuesta.headers.get('cache-control') || 'private, max-age=86400',
    });
    return res.end(Buffer.from(await respuesta.arrayBuffer()));
  } catch (err) {
    return next(err);
  }
}

module.exports = { reenviarACore, forward, forwardImagen };

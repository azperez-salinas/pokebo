// Reenvía una request al Core API. En AWS, el Security Group del Core solo acepta
// conexiones originadas en el Security Group de Edge.
const config = require('../config');
const { AppError } = require('../utils/errors');

// Headers del cliente que se propagan al Core
const HEADERS_PROPAGADOS = ['authorization', 'x-app-version', 'accept-language'];

function headersAlCore(headers) {
  const outHeaders = {};
  for (const nombre of HEADERS_PROPAGADOS) {
    if (headers[nombre]) outHeaders[nombre] = headers[nombre];
  }
  return outHeaders;
}

async function reenviarACore(path, metodo, body, headers = {}) {
  const method = metodo.toUpperCase();
  const tieneBody = !['GET', 'HEAD'].includes(method) && body !== undefined;
  const bodyCrudo = tieneBody ? JSON.stringify(body) : '';

  const outHeaders = headersAlCore(headers);
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
    const outHeaders = headersAlCore(req.headers);

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

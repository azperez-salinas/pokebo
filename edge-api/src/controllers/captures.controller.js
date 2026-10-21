// POST /captures en el Edge: identifica la especie con la IA y reenvía al Core.
// El Edge no guarda nada: la imagen viaja al Core en base64 dentro del JSON firmado (HMAC).
const { identificarEspecie } = require('../services/ai.service');
const { reenviarACore } = require('../services/forward.service');
const { AppError } = require('../utils/errors');

// Chequeo barato antes de pagar una consulta a la IA. La validación completa la hace el Core.
function coordenada(valor, min, max) {
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= min && numero <= max ? numero : null;
}

async function create(req, res, next) {
  try {
    const lat = coordenada(req.body.lat, -90, 90);
    const lng = coordenada(req.body.lng, -180, 180);
    if (lat === null || lng === null) {
      throw new AppError(400, 'VALIDATION_ERROR', 'lat debe estar entre -90 y 90 y lng entre -180 y 180');
    }

    const ai = await identificarEspecie(req.file.buffer);

    const body = {
      imageBase64: req.file.buffer.toString('base64'),
      contentType: 'image/jpeg',
      lat,
      lng,
      ai,
    };
    const { status, data } = await reenviarACore(req.originalUrl, 'POST', body, req.headers);
    return data === null ? res.status(status).end() : res.status(status).json(data);
  } catch (err) {
    return next(err);
  }
}

module.exports = { create };

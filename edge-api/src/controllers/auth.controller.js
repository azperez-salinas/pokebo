const { reenviarACore } = require('../services/forward.service');
const mailService = require('../services/mail.service');
const config = require('../config');

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function forwardWithEmailDelivery(req, res, next) {
  const startedAt = Date.now();
  try {
    const { status, data } = await reenviarACore(req.originalUrl, req.method, req.body, req.headers);
    if (status >= 400 || !data || !data.public) {
      return data === null ? res.status(status).end() : res.status(status).json(data);
    }

    if (data.delivery) {
      try {
        await mailService.sendCodeEmail(data.delivery);
      } catch (error) {
        // La respuesta publica no cambia segun exista el correo ni segun el resultado del proveedor.
        // El desafio sigue vigente y el usuario puede solicitar un reenvio.
        console.error('No se pudo enviar el correo de verificacion:', error.message);
      }
    }
    const remainingDelay = config.registrationResponseMinMs - (Date.now() - startedAt);
    if (remainingDelay > 0) await wait(remainingDelay);
    return res.status(status).json(data.public);
  } catch (error) {
    return next(error);
  }
}

module.exports = { forwardWithEmailDelivery };

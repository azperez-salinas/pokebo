// Verifica que la request venga del Edge API.
// TODO: verificar firma HMAC con SERVICE_SHARED_SECRET (rechazar con 401 si no coincide).
function serviceAuth(req, res, next) {
  next();
}

module.exports = serviceAuth;

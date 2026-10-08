// TODO: leer la versión de la app desde un header (ej. X-App-Version), compararla
// con la versión mínima soportada y responder 426 si está desactualizada.
function appVersion(req, res, next) {
  next();
}

module.exports = appVersion;

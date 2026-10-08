// TODO: verificar el JWT (Authorization: Bearer ...) con config.jwtPublicKey
// y dejar los datos del usuario en req.user. Si es inválido, responder 401.
function auth(req, res, next) {
  next();
}

module.exports = auth;

// TODO: verificar JWT con clave pública y dejar el usuario en req.user.
function auth(req, res, next) {
  next();
}

module.exports = auth;

// Verifica el access token (Authorization: Bearer ...) con la clave pública (RS256)
// y deja el usuario en req.user. Si falta, es inválido o expiró responde 401.
const { verifyToken } = require('../services/token.service');
const { AppError } = require('../utils/errors');

function auth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Falta el token de acceso'));
  }

  try {
    const payload = verifyToken(token);
    // Un refresh token no sirve como access token
    if (payload.type !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado'));
  }
}

module.exports = auth;

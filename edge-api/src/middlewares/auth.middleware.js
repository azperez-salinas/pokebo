// Verifica el JWT (Authorization: Bearer ...) con config.jwtPublicKey (RS256)
// y deja los datos del usuario en req.user. Si es inválido o expiró, responde 401.
// El Core vuelve a verificarlo: el Edge no confía en que el pedido ya venga filtrado y viceversa.
const jwt = require('jsonwebtoken');
const config = require('../config');
const { AppError } = require('../utils/errors');

function auth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Falta el token de acceso'));
  }

  try {
    const payload = jwt.verify(token, config.jwtPublicKey, { algorithms: ['RS256'] });
    // Un refresh token no sirve como access token
    if (payload.type !== 'access') throw new Error('wrong token type');
    req.user = { id: payload.sub, username: payload.username };
    return next();
  } catch (err) {
    return next(new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado'));
  }
}

module.exports = auth;

// Emisión de JWT (RS256) y persistencia de refresh tokens en Redis.
// Key de cada refresh: refresh:<userId>:<jti>, con TTL igual a la expiración del token.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { redisClient } = require('../config/redis');

const refreshKey = (userId, jti) => `refresh:${userId}:${jti}`;

function signAccessToken(user) {
  return jwt.sign({ type: 'access', username: user.username }, config.jwtPrivateKey, {
    algorithm: 'RS256',
    subject: String(user._id),
    expiresIn: config.accessTokenTtl,
  });
}

function signRefreshToken(user, jti) {
  return jwt.sign({ type: 'refresh' }, config.jwtPrivateKey, {
    algorithm: 'RS256',
    subject: String(user._id),
    jwtid: jti,
    expiresIn: config.refreshTokenTtl,
  });
}

// Verifica firma y expiración; lanza error de jsonwebtoken si no es válido
function verifyToken(token) {
  return jwt.verify(token, config.jwtPublicKey, { algorithms: ['RS256'] });
}

async function storeRefreshToken(userId, jti) {
  const value = JSON.stringify({ userId: String(userId), createdAt: new Date().toISOString() });
  await redisClient.set(refreshKey(userId, jti), value, {
    expiration: { type: 'EX', value: config.refreshTokenTtl },
  });
}

async function findRefreshToken(userId, jti) {
  const value = await redisClient.get(refreshKey(userId, jti));
  return value ? JSON.parse(value) : null;
}

async function revokeRefreshToken(userId, jti) {
  await redisClient.del(refreshKey(userId, jti));
}

// Genera access + refresh y deja el refresh guardado en Redis
async function issueTokens(user) {
  const jti = crypto.randomUUID();
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user, jti);
  await storeRefreshToken(user._id, jti);
  return { accessToken, refreshToken };
}

module.exports = {
  issueTokens,
  verifyToken,
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
};

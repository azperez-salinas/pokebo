const config = require('./index');

// Conexión a Redis. La URI sale de REDIS_URI; no hay credenciales en el código.
async function connectRedis() {
  // TODO: elegir cliente (redis / ioredis), instalarlo y crear la conexión con config.redisUri
  throw new Error('not implemented');
}

module.exports = { connectRedis };

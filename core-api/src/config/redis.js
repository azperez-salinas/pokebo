const config = require('./index');
const { createClient } = require('redis');

// Conexión a Redis: La URI sale de REDIS_URI; no hay credenciales en el código.
const redisClient = createClient({
  url: config.redisUri
});

redisClient.on('error', (err) => {
  console.error('Error de Redis:', err);
});

async function connectRedis() {

  await redisClient.connect();

  console.log('Redis conectado correctamente');
}

module.exports = { connectRedis, redisClient };

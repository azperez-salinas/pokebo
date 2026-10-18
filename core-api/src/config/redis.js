const config = require('./index');
const { createClient } = require('redis');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000; // 2 segundos entre reintentos


let conectoAlgunaVez = false;

// Conexión a Redis: La URI sale de REDIS_URI; no hay credenciales en el código.
const redisClient = createClient({
  url: config.redisUri,
  socket: {
    reconnectStrategy: (retries) => {
      if (!conectoAlgunaVez && retries >= MAX_RETRIES) {
        return new Error('No se pudo conectar a Redis');
      }
      return RETRY_DELAY_MS;
    },
  },
});

redisClient.on('ready', () => {
  conectoAlgunaVez = true;
});

redisClient.on('error', (err) => {
  console.error('Error de Redis:', err.message);
});

async function connectRedis() {
  await redisClient.connect();

  console.log('Redis conectado correctamente');
}

module.exports = { connectRedis, redisClient };

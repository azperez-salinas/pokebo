// Configuración leída de variables de entorno. No hardcodear valores reales acá.
const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
  serviceSharedSecret: process.env.SERVICE_SHARED_SECRET,
  mongoUri: process.env.MONGO_URI,
  redisUri: process.env.REDIS_URI,
};

module.exports = config;

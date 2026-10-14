// Configuración leída de variables de entorno. No hardcodear valores reales acá.
//
// Claves JWT (RS256): el Core firma con JWT_PRIVATE_KEY; el Edge verifica con JWT_PUBLIC_KEY.
// Se guardan en los .env como PEM en una sola línea con los saltos escapados (\n).
// Para regenerarlas:
//   openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out private.pem
//   openssl pkey -in private.pem -pubout -out public.pem
//   awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' private.pem   -> JWT_PRIVATE_KEY (solo core-api/.env)
//   awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' public.pem    -> JWT_PUBLIC_KEY (core-api/.env y edge-api/.env)
// Después borrar los .pem. Al rotarlas, todos los tokens emitidos dejan de ser válidos.
const crypto = require('crypto');

// Acepta el PEM con saltos reales o escapados como "\n"
const pem = (value) => (value ? value.replace(/\\n/g, '\n') : undefined);

const jwtPrivateKey = pem(process.env.JWT_PRIVATE_KEY);
// Si no está JWT_PUBLIC_KEY, se deriva de la privada
const jwtPublicKey =
  pem(process.env.JWT_PUBLIC_KEY) ||
  (jwtPrivateKey ? crypto.createPublicKey(jwtPrivateKey).export({ type: 'spki', format: 'pem' }) : undefined);

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  jwtPrivateKey,
  jwtPublicKey,
  accessTokenTtl: 15 * 60, // segundos
  refreshTokenTtl: 30 * 24 * 60 * 60, // segundos
  serviceSharedSecret: process.env.SERVICE_SHARED_SECRET,
  mongoUri: process.env.MONGO_URI,
  redisUri: process.env.REDIS_URI,
};

module.exports = config;

// Configuración leída de variables de entorno. No hardcodear valores reales acá.
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  coreApiUrl: process.env.CORE_API_URL,
  jwtPublicKey: process.env.JWT_PUBLIC_KEY,
  serviceSharedSecret: process.env.SERVICE_SHARED_SECRET,
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  firebaseCredentials: process.env.FIREBASE_CREDENTIALS,
};

module.exports = config;

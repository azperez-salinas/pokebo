// Configuración leída de variables de entorno. No hardcodear valores reales acá.
const config = {
  port: parseInt(process.env.PORT, 10) || 3000,
  coreApiUrl: process.env.CORE_API_URL,
  // PEM con saltos escapados (\n) en el .env
  jwtPublicKey: process.env.JWT_PUBLIC_KEY ? process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n') : undefined,
  serviceSharedSecret: process.env.SERVICE_SHARED_SECRET,
  aiProviderApiKey: process.env.AI_PROVIDER_API_KEY,
  aiModel: process.env.AI_MODEL,
  firebaseCredentials: process.env.FIREBASE_CREDENTIALS,
  mailProvider: process.env.MAIL_PROVIDER || 'console',
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT, 10) || 465,
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: process.env.SMTP_USER,
  smtpAppPassword: process.env.SMTP_APP_PASSWORD,
  mailFrom: process.env.MAIL_FROM,
  registrationResponseMinMs: parseInt(process.env.REGISTRATION_RESPONSE_MIN_MS, 10) || 1000,
};

module.exports = config;

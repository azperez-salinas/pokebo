const nodemailer = require('nodemailer');
const config = require('../config');

let smtpTransport;

function emailHtml(code) {
  return `
    <main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h1>Verificá tu cuenta de Pokebo</h1>
      <p>Tu código de verificación es:</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
      <p>Este código es válido por 5 minutos.</p>
      <p>Si no solicitaste este registro, ignorá este correo.</p>
    </main>`;
}

function emailText(code) {
  return [
    'Verificá tu cuenta de Pokebo',
    '',
    `Tu código de verificación es: ${code}`,
    'Este código es válido por 5 minutos.',
    '',
    'Si no solicitaste este registro, ignorá este correo.',
  ].join('\n');
}

function validateSmtpConfig() {
  const missing = [
    ['SMTP_HOST', config.smtpHost],
    ['SMTP_USER', config.smtpUser],
    ['SMTP_APP_PASSWORD', config.smtpAppPassword],
    ['MAIL_FROM', config.mailFrom],
  ].filter(([, value]) => !value).map(([name]) => name);

  if (missing.length) {
    throw new Error(`Falta configuración SMTP en el Edge API: ${missing.join(', ')}`);
  }
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;

  validateSmtpConfig();
  smtpTransport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: {
      user: config.smtpUser,
      pass: config.smtpAppPassword,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return smtpTransport;
}

async function sendWithSmtp({ email, code }) {
  const info = await getSmtpTransport().sendMail({
    from: config.mailFrom,
    to: email,
    subject: 'Tu código de verificación de Pokebo',
    text: emailText(code),
    html: emailHtml(code),
  });

  return { id: info.messageId, provider: 'smtp' };
}

async function sendRegistrationCode(delivery) {
  if (config.mailProvider === 'console') {
    console.log(`[MAIL MOCK] Código de registro para ${delivery.email}: ${delivery.code} (válido 5 minutos)`);
    return { provider: 'console' };
  }
  if (config.mailProvider === 'smtp') return sendWithSmtp(delivery);
  throw new Error(`MAIL_PROVIDER no soportado: ${config.mailProvider}`);
}

module.exports = { sendRegistrationCode };

const nodemailer = require('nodemailer');
const config = require('../config');

let smtpTransport;

function messageFor(delivery) {
  const minutes = Math.max(1, Math.ceil((delivery.expiresIn || 300) / 60));
  if (delivery.purpose === 'login') {
    return {
      subject: 'Tu código para iniciar sesión en Pokebo',
      heading: 'Confirmá tu inicio de sesión en Pokebo',
      introduction: 'Usá este código para completar el inicio de sesión:',
      validity: `Este código es válido por ${minutes} minutos.`,
      disclaimer: 'Si no intentaste iniciar sesión, cambiá tu contraseña y no compartas este código.',
    };
  }
  return {
    subject: 'Tu código de verificación de Pokebo',
    heading: 'Verificá tu cuenta de Pokebo',
    introduction: 'Tu código de verificación es:',
    validity: `Este código es válido por ${minutes} minutos.`,
    disclaimer: 'Si no solicitaste este registro, ignorá este correo.',
  };
}

function emailHtml(delivery) {
  const message = messageFor(delivery);
  return `
    <main style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172554">
      <h1>${message.heading}</h1>
      <p>${message.introduction}</p>
      <p style="font-size:32px;font-weight:bold;letter-spacing:8px">${delivery.code}</p>
      <p>${message.validity}</p>
      <p>${message.disclaimer}</p>
    </main>`;
}

function emailText(delivery) {
  const message = messageFor(delivery);
  return [
    message.heading,
    '',
    `${message.introduction} ${delivery.code}`,
    message.validity,
    '',
    message.disclaimer,
  ].join('\n');
}

function validateSmtpConfig() {
  const missing = [
    ['SMTP_HOST', config.smtpHost],
    ['SMTP_USER', config.smtpUser],
    ['SMTP_APP_PASSWORD', config.smtpAppPassword],
    ['MAIL_FROM', config.mailFrom],
  ].filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) throw new Error(`Falta configuración SMTP en el Edge API: ${missing.join(', ')}`);
}

function getSmtpTransport() {
  if (smtpTransport) return smtpTransport;
  validateSmtpConfig();
  smtpTransport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth: { user: config.smtpUser, pass: config.smtpAppPassword },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
  return smtpTransport;
}

async function sendWithSmtp(delivery) {
  const message = messageFor(delivery);
  const info = await getSmtpTransport().sendMail({
    from: config.mailFrom,
    to: delivery.email,
    subject: message.subject,
    text: emailText(delivery),
    html: emailHtml(delivery),
  });
  return { id: info.messageId, provider: 'smtp' };
}

async function sendCodeEmail(delivery) {
  if (config.mailProvider === 'console') {
    console.log(`[MAIL MOCK] Código de ${delivery.purpose || 'registro'} para ${delivery.email}: ${delivery.code}`);
    return { provider: 'console' };
  }
  if (config.mailProvider === 'smtp') return sendWithSmtp(delivery);
  throw new Error(`MAIL_PROVIDER no soportado: ${config.mailProvider}`);
}

module.exports = { sendCodeEmail };

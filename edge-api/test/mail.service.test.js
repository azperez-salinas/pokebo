const test = require('node:test');
const assert = require('node:assert/strict');

process.env.MAIL_PROVIDER = 'smtp';
process.env.SMTP_HOST = 'smtp.example.test';
process.env.SMTP_PORT = '465';
process.env.SMTP_SECURE = 'true';
process.env.SMTP_USER = 'sender@example.test';
process.env.SMTP_APP_PASSWORD = 'test-only-password';
process.env.MAIL_FROM = 'Pokebo <sender@example.test>';

let sentMessage;
const nodemailer = require('nodemailer');
nodemailer.createTransport = () => ({
  async sendMail(message) {
    sentMessage = message;
    return { messageId: 'message-id' };
  },
});

const mailService = require('../src/services/mail.service');

test('el correo de login tiene contenido específico y no expone credenciales', async () => {
  const result = await mailService.sendCodeEmail({
    purpose: 'login',
    email: 'persona@correo.test',
    code: 'A7K3PX',
    expiresIn: 300,
  });

  assert.equal(result.provider, 'smtp');
  assert.equal(sentMessage.to, 'persona@correo.test');
  assert.match(sentMessage.subject, /iniciar sesión/i);
  assert.match(sentMessage.text, /A7K3PX/);
  assert.match(sentMessage.text, /5 minutos/);
  assert.doesNotMatch(sentMessage.text, /password|contraseña de aplicación/i);
});

test('el correo de registro conserva su plantilla de verificación', async () => {
  await mailService.sendCodeEmail({
    purpose: 'registration',
    email: 'persona@correo.test',
    code: 'B8M4QZ',
    expiresIn: 300,
  });

  assert.match(sentMessage.subject, /verificación/i);
  assert.match(sentMessage.text, /B8M4QZ/);
});

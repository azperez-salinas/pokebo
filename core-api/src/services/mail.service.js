// MOCK de envío de mails para desarrollo/demo: no manda nada, solo lo escribe en consola.
// En producción hay que reemplazarlo por un proveedor real (ej. Resend, o Nodemailer con SMTP).
// Se elige con MAIL_PROVIDER; por ahora el único valor soportado es "console".
// Ojo: el Core no tiene salida a internet, así que un proveedor real tendría que ir por el Edge.
const config = require('../config');

async function sendPasswordResetCode(email, code) {
  if (config.mailProvider !== 'console') {
    throw new Error(`MAIL_PROVIDER no soportado: ${config.mailProvider}`);
  }
  console.log(`[MAIL MOCK] Código de recuperación para ${email}: ${code}`);
}

module.exports = { sendPasswordResetCode };

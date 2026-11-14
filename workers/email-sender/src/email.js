const CONTENT = {
  registration: {
    subject: 'Confirma tu cuenta de PokebO',
    introduction: 'Usa este código para completar tu registro:',
  },
  login: {
    subject: 'Código de acceso a PokebO',
    introduction: 'Usa este código para iniciar sesión:',
  },
  'password-reset': {
    subject: 'Recuperación de contraseña de PokebO',
    introduction: 'Usa este código para restablecer tu contraseña:',
  },
};

function buildEmail({ purpose, code, expiresInSeconds }) {
  const content = CONTENT[purpose];
  if (!content) throw new TypeError('Propósito de correo no soportado');

  const minutes = Math.max(1, Math.ceil(expiresInSeconds / 60));
  const expiration = `El código vence en ${minutes} minuto${minutes === 1 ? '' : 's'}.`;
  return {
    subject: content.subject,
    text: `${content.introduction}\n\n${code}\n\n${expiration}\n\nSi no solicitaste este código, ignora este correo.`,
    html: [
      '<!doctype html><html><body>',
      `<p>${content.introduction}</p>`,
      `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>`,
      `<p>${expiration}</p>`,
      '<p>Si no solicitaste este código, ignora este correo.</p>',
      '</body></html>',
    ].join(''),
  };
}

module.exports = { buildEmail };

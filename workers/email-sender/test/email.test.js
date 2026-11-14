const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEmail } = require('../src/email');

test('buildEmail crea contenido para cada propósito sin alterar el OTP', () => {
  for (const purpose of ['registration', 'login', 'password-reset']) {
    const email = buildEmail({ purpose, code: 'A1B2C3', expiresInSeconds: 300 });
    assert.ok(email.subject.length > 0);
    assert.match(email.text, /A1B2C3/);
    assert.match(email.html, /A1B2C3/);
    assert.match(email.text, /5 minutos/);
  }
});

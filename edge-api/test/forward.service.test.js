const test = require('node:test');
const assert = require('node:assert/strict');
process.env.CORE_API_URL = 'http://core.internal:4000';

const { reenviarACore } = require('../src/services/forward.service');

test('reenviarACore propaga únicamente headers permitidos', async () => {
  const originalFetch = global.fetch;
  const requests = [];
  global.fetch = async (url, options) => {
    requests.push({ url, options });
    return { status: 202, text: async () => JSON.stringify({ accepted: true }) };
  };

  try {
    const result = await reenviarACore('/api/v1/registrations', 'post', { email: 'user@example.com' }, {
      authorization: 'Bearer token',
      'x-app-version': '1.0.0',
      cookie: 'no-propagar',
    });

    assert.deepEqual(result, { status: 202, data: { accepted: true } });
    assert.equal(requests[0].url, 'http://core.internal:4000/api/v1/registrations');
    assert.equal(requests[0].options.method, 'POST');
    assert.equal(requests[0].options.headers.cookie, undefined);
    assert.equal(requests[0].options.headers.authorization, 'Bearer token');

    assert.equal(requests[0].options.headers['X-Service-Signature'], undefined);
    assert.equal(requests[0].options.headers['X-Service-Timestamp'], undefined);
  } finally {
    global.fetch = originalFetch;
  }
});

test('reenviarACore traduce un fallo de red a CORE_UNAVAILABLE sin filtrar el error original', async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => { throw new Error('detalle privado de red'); };

  try {
    await assert.rejects(
      reenviarACore('/api/v1/health', 'get'),
      (error) => error.status === 502
        && error.code === 'CORE_UNAVAILABLE'
        && !error.message.includes('detalle privado'),
    );
  } finally {
    global.fetch = originalFetch;
  }
});

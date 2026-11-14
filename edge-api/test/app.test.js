const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('Edge confía exactamente en un proxy inverso para resolver la IP del cliente', () => {
  assert.equal(app.get('trust proxy'), 1);
});

test('GET /health responde 200 sin token ni versión de app', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    server.close();
  }
});

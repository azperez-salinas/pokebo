const test = require('node:test');
const assert = require('node:assert/strict');
const app = require('../src/app');

test('Edge confía exactamente en un proxy inverso para resolver la IP del cliente', () => {
  assert.equal(app.get('trust proxy'), 1);
});

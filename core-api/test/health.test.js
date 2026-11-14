const test = require('node:test');
const assert = require('node:assert/strict');
const { healthStatus } = require('../src/utils/health');

test('health: 200 solo con MongoDB conectado y Redis listo', () => {
  assert.deepEqual(healthStatus({ mongoReadyState: 1, redisReady: true }), {
    httpStatus: 200,
    body: { status: 'ok', mongo: true, redis: true },
  });
});

test('health: 503 si falta MongoDB o Redis', () => {
  for (const [mongoReadyState, redisReady] of [[0, true], [2, true], [1, false], [1, undefined], [0, false]]) {
    const result = healthStatus({ mongoReadyState, redisReady });
    assert.equal(result.httpStatus, 503);
    assert.equal(result.body.status, 'degraded');
  }
});

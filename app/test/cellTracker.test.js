const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/cellTracker.js');
const MIN = 60 * 1000;

test('la primera lectura informa la celda', async () => {
  const { decideCellChange } = await load();
  const { action, next } = decideCellChange(null, 'A', 1000);
  assert.equal(action, 'report');
  assert.deepEqual(next, { current: 'A', previous: null, changedAt: 1000 });
});

test('seguir en la misma celda no hace nada', async () => {
  const { decideCellChange } = await load();
  const state = { current: 'A', previous: null, changedAt: 0 };
  const result = decideCellChange(state, 'A', 10 * MIN);
  assert.equal(result.action, 'none');
  assert.equal(result.next, state);
});

test('pasar a una celda nueva informa y guarda la anterior', async () => {
  const { decideCellChange } = await load();
  const { action, next } = decideCellChange({ current: 'A', previous: null, changedAt: 0 }, 'B', 2 * MIN);
  assert.equal(action, 'report');
  assert.deepEqual(next, { current: 'B', previous: 'A', changedAt: 2 * MIN });
});

test('volver a la celda anterior dentro de la espera se ignora', async () => {
  const { decideCellChange, REENTRY_COOLDOWN_MS } = await load();
  const state = { current: 'B', previous: 'A', changedAt: 0 };
  const result = decideCellChange(state, 'A', REENTRY_COOLDOWN_MS - 1);
  assert.equal(result.action, 'ignore');
  assert.equal(result.next, state);
});

test('volver a la celda anterior pasada la espera sí se informa', async () => {
  const { decideCellChange, REENTRY_COOLDOWN_MS } = await load();
  const state = { current: 'B', previous: 'A', changedAt: 0 };
  const { action, next } = decideCellChange(state, 'A', REENTRY_COOLDOWN_MS);
  assert.equal(action, 'report');
  assert.deepEqual(next, { current: 'A', previous: 'B', changedAt: REENTRY_COOLDOWN_MS });
});

test('una celda distinta de la anterior se informa aunque sea pronto', async () => {
  const { decideCellChange } = await load();
  const state = { current: 'B', previous: 'A', changedAt: 0 };
  assert.equal(decideCellChange(state, 'C', 1000).action, 'report');
});

const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/locationProcessor.js');
const loadH3 = () => import('../src/utils/h3.js');

// Dos puntos de Montevideo lejos entre sí (distintas celdas) y uno contiguo al primero.
const P1 = [-34.9011, -56.1645];
const P2 = [-34.8500, -56.1000];

function setup({ nearby = [], failReport = false } = {}) {
  const calls = { report: [], notify: [] };
  const store = { state: null, now: 0 };
  return { calls, store, deps: {
    loadState: async () => store.state,
    saveState: async (s) => { store.state = s; },
    report: async (cell) => {
      calls.report.push(cell);
      if (failReport) throw new Error('sin red');
      return { nearby };
    },
    notify: async (n) => { calls.notify.push(n); },
    now: () => store.now,
  } };
}

test('primera lectura: informa y notifica si hay avistamientos', async () => {
  const { createLocationProcessor } = await load();
  const { cellOf } = await loadH3();
  const { calls, store, deps } = setup({ nearby: [{ id: '1', species: { commonName: 'Zorro' }, zone: 'near' }] });
  await createLocationProcessor(deps)(...P1);
  assert.deepEqual(calls.report, [cellOf(...P1)]);
  assert.equal(calls.notify.length, 1);
  assert.equal(store.state.current, cellOf(...P1));
});

test('misma celda: no hay pedido', async () => {
  const { createLocationProcessor } = await load();
  const { calls, deps } = setup();
  const process = createLocationProcessor(deps);
  await process(...P1);
  await process(...P1);
  assert.equal(calls.report.length, 1);
});

test('sin avistamientos no notifica', async () => {
  const { createLocationProcessor } = await load();
  const { calls, deps } = setup({ nearby: [] });
  await createLocationProcessor(deps)(...P1);
  assert.equal(calls.notify.length, 0);
});

test('ida y vuelta rápida: la vuelta se ignora; pasada la espera se informa', async () => {
  const { createLocationProcessor } = await load();
  const { REENTRY_COOLDOWN_MS } = await import('../src/utils/cellTracker.js');
  const { calls, store, deps } = setup();
  const process = createLocationProcessor(deps);
  await process(...P1);
  store.now = 1000;
  await process(...P2);
  store.now = 2000;
  const back = await process(...P1);
  assert.equal(back.action, 'ignore');
  assert.equal(calls.report.length, 2);
  store.now = 1000 + REENTRY_COOLDOWN_MS;
  assert.equal((await process(...P1)).action, 'report');
  assert.equal(calls.report.length, 3);
});

test('si el pedido falla el estado no avanza y la próxima lectura reintenta', async () => {
  const { createLocationProcessor } = await load();
  const failing = setup({ failReport: true });
  await assert.rejects(createLocationProcessor(failing.deps)(...P1), /sin red/);
  assert.equal(failing.store.state, null);
  assert.equal(failing.calls.notify.length, 0);

  const ok = setup();
  ok.deps.loadState = failing.deps.loadState;
  ok.deps.saveState = failing.deps.saveState;
  await createLocationProcessor(ok.deps)(...P1);
  assert.equal(ok.calls.report.length, 1);
});

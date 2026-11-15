const test = require('node:test');
const assert = require('node:assert/strict');

// --- Modelo Notification simulado en memoria ---
let store = [];
let nextId = 1;
const matches = (doc, filter) => Object.entries(filter).every(([key, cond]) => {
  if (key === 'createdAt') return doc.createdAt < cond.$lt;
  return String(doc[key]) === String(cond);
});

const Notification = {
  async create(data) {
    const doc = { _id: `n${nextId++}`, read: false, createdAt: new Date(2026, 10, 5, 12, nextId), ...data };
    store.push(doc);
    return doc;
  },
  find(filter) {
    let result = store.filter((doc) => matches(doc, filter));
    const query = {
      sort: () => { result = [...result].sort((a, b) => b.createdAt - a.createdAt); return query; },
      limit: (n) => { result = result.slice(0, n); return query; },
      lean: async () => result,
    };
    return query;
  },
  async countDocuments(filter) { return store.filter((doc) => matches(doc, filter)).length; },
  findOneAndUpdate(filter, update) {
    const doc = store.find((item) => matches(item, filter));
    if (doc) Object.assign(doc, update.$set);
    return { lean: async () => doc || null };
  },
  async updateMany(filter, update) {
    const docs = store.filter((doc) => matches(doc, filter));
    docs.forEach((doc) => Object.assign(doc, update.$set));
    return { modifiedCount: docs.length };
  },
};

const resolved = require.resolve('../src/models/Notification.model');
require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports: Notification };
const service = require('../src/services/notifications.service');

const reset = () => { store = []; nextId = 1; };

test('lista las más recientes primero, con cantidad de no leídas y filtro por tipo', async () => {
  reset();
  await service.create('yo', { type: 'capture', title: 'a' });
  await service.create('yo', { type: 'nearby', title: 'b' });
  await service.create('otro', { type: 'nearby', title: 'ajena' });

  const all = await service.listForUser('yo');
  assert.deepEqual(all.notifications.map((n) => n.title), ['b', 'a']);
  assert.equal(all.unreadCount, 2);
  assert.equal(all.nextBefore, null);

  const nearby = await service.listForUser('yo', { type: 'nearby' });
  assert.deepEqual(nearby.notifications.map((n) => n.title), ['b']);
});

test('pagina con before/nextBefore', async () => {
  reset();
  for (const title of ['1', '2', '3']) await service.create('yo', { type: 'capture', title });
  const first = await service.listForUser('yo', { limit: 2 });
  assert.deepEqual(first.notifications.map((n) => n.title), ['3', '2']);
  assert.ok(first.nextBefore);
  const second = await service.listForUser('yo', { limit: 2, before: first.nextBefore });
  assert.deepEqual(second.notifications.map((n) => n.title), ['1']);
});

test('marcar como leída solo funciona con las propias y baja el contador', async () => {
  reset();
  const mine = await service.create('yo', { type: 'capture', title: 'mia' });
  const theirs = await service.create('otro', { type: 'capture', title: 'ajena' });

  assert.equal((await service.markRead('yo', mine.id)).read, true);
  await assert.rejects(() => service.markRead('yo', theirs.id), { status: 404, code: 'NOTIFICATION_NOT_FOUND' });
  assert.equal((await service.listForUser('yo')).unreadCount, 0);
});

test('marcar todas como leídas, opcionalmente por tipo', async () => {
  reset();
  await service.create('yo', { type: 'capture', title: 'a' });
  await service.create('yo', { type: 'nearby', title: 'b' });
  await service.create('yo', { type: 'nearby', title: 'c' });

  assert.deepEqual(await service.markAllRead('yo', { type: 'nearby' }), { updated: 2 });
  assert.equal((await service.listForUser('yo')).unreadCount, 1);
  assert.deepEqual(await service.markAllRead('yo'), { updated: 1 });
});

test('createSafe no tira error si el guardado falla', async () => {
  reset();
  const original = Notification.create;
  Notification.create = async () => { throw new Error('mongo caído'); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.equal(await service.createSafe('yo', { type: 'capture', title: 'x' }), null);
  } finally {
    Notification.create = original;
    console.warn = originalWarn;
  }
});

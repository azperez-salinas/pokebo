const test = require('node:test');
const assert = require('node:assert/strict');

// --- Modelos simulados: solo las consultas que usa achievements.service ---
const SPECIES = {
  gorrion: { _id: 's1', class: 'Aves', family: 'Passeridae', category: 'comun' },
  pato: { _id: 's2', class: 'Aves', family: 'Anatidae', category: 'comun' },
  delfin: { _id: 's3', class: 'Mammalia', family: 'Delphinidae', category: 'raro' },
  puma: { _id: 's4', class: 'Mammalia', family: 'Felidae', category: 'muy_raro' },
};

let catalog = [];
let userAchievements = [];
let captures = [];
const created = [];

const Achievement = {
  find() {
    const query = { sort: () => query, lean: async () => catalog };
    return query;
  },
};
const UserAchievement = {
  find: (filter) => ({ lean: async () => userAchievements.filter((u) => u.user === filter.user) }),
  findOneAndUpdate(filter, update) {
    let doc = userAchievements.find((u) => u.user === filter.user && String(u.achievement) === String(filter.achievement));
    if (filter.unlockedAt?.$exists === false && doc?.unlockedAt) doc = null; // la transición ya ocurrió
    if (!doc && !update.$set) {
      doc = { user: filter.user, achievement: filter.achievement, progress: 0 };
      userAchievements.push(doc);
    }
    if (doc && update.$max) doc.progress = Math.max(doc.progress, update.$max.progress);
    if (doc && update.$set) Object.assign(doc, update.$set);
    return { lean: async () => (doc ? { ...doc } : null) };
  },
};
const Capture = {
  countDocuments: async (filter) => captures.filter((c) => c.user === filter.user).length,
  distinct: async (field, filter) => [...new Set(captures.filter((c) => c.user === filter.user).map((c) => c[field]))],
};
const Species = {
  find: (filter) => ({
    select: () => ({ lean: async () => Object.values(SPECIES).filter((s) => filter._id.$in.includes(s._id)) }),
  }),
};

const inject = (path, exports) => {
  const resolved = require.resolve(path);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};
inject('../src/models/Achievement.model', Achievement);
inject('../src/models/UserAchievement.model', UserAchievement);
inject('../src/models/Capture.model', Capture);
inject('../src/models/Species.model', Species);
inject('../src/models/Notification.model', {
  create: async (doc) => { created.push(doc); return { _id: `n${created.length}`, ...doc }; },
});

const service = require('../src/services/achievements.service');

const ach = (id, code, criteria, group = 'aves') => ({ _id: id, code, name: code, description: '', icon: 'x', group, criteria });

function reset() {
  catalog = [
    ach('a1', 'first', { type: 'total_captures', threshold: 1 }, 'inicio'),
    ach('a2', 'aves_2', { type: 'distinct_species', filter: { class: 'Aves' }, threshold: 2 }),
    ach('a3', 'acuaticos_2', { type: 'distinct_species', filter: { families: ['Anatidae', 'Delphinidae'] }, threshold: 2 }, 'acuaticos'),
    ach('a4', 'felino', { type: 'distinct_species', filter: { family: 'Felidae' }, threshold: 1 }, 'mamiferos'),
    ach('a5', 'muy_raro', { type: 'distinct_species', filter: { category: 'muy_raro' }, threshold: 1 }, 'rareza'),
  ];
  userAchievements = [];
  captures = [];
  created.length = 0;
}
const capture = (species, user = 'yo') => { captures.push({ user, species: SPECIES[species]._id }); return { _id: `c${captures.length}` }; };

test('matchesFilter combina clase, familia, lista de familias y rareza', () => {
  const { matchesFilter } = service;
  assert.equal(matchesFilter(SPECIES.pato, { class: 'Aves' }), true);
  assert.equal(matchesFilter(SPECIES.pato, { class: 'Mammalia' }), false);
  assert.equal(matchesFilter(SPECIES.delfin, { families: ['Anatidae', 'Delphinidae'] }), true);
  assert.equal(matchesFilter(SPECIES.puma, { family: 'Felidae', category: 'muy_raro' }), true);
  assert.equal(matchesFilter(SPECIES.puma, {}), true);
});

test('la primera captura desbloquea "first" y crea la notificación', async () => {
  reset();
  const c = capture('gorrion');
  const unlocked = await service.evaluate('yo', c);
  assert.deepEqual(unlocked.map((a) => a.code), ['first']);
  assert.equal(created.length, 1);
  assert.equal(created[0].type, 'achievement');
  assert.equal(created[0].body, 'first');
});

test('especies repetidas no suman; las distintas sí, y se desbloquea una sola vez', async () => {
  reset();
  await service.evaluate('yo', capture('gorrion'));
  assert.deepEqual((await service.evaluate('yo', capture('gorrion'))).map((a) => a.code), []);
  assert.deepEqual((await service.evaluate('yo', capture('pato'))).map((a) => a.code), ['aves_2']);
  assert.deepEqual((await service.evaluate('yo', capture('pato'))).map((a) => a.code), []);
  assert.equal(created.filter((n) => n.body === 'aves_2').length, 1);
});

test('un grupo de familias (acuáticos) junta aves y mamíferos', async () => {
  reset();
  await service.evaluate('yo', capture('pato'));
  const unlocked = await service.evaluate('yo', capture('delfin'));
  assert.ok(unlocked.some((a) => a.code === 'acuaticos_2'));
});

test('un mismo capture puede desbloquear varios logros a la vez', async () => {
  reset();
  const unlocked = await service.evaluate('yo', capture('puma'));
  assert.deepEqual(unlocked.map((a) => a.code).sort(), ['felino', 'first', 'muy_raro']);
});

test('listForUser agrupa, calcula progreso con capturas anteriores y no cuenta las de otros', async () => {
  reset();
  capture('gorrion');
  capture('pato');
  capture('puma', 'otro');
  const result = await service.listForUser('yo');

  const aves = result.groups.find((g) => g.id === 'aves').achievements[0];
  assert.equal(aves.progress, 2);
  assert.equal(aves.unlocked, true);
  const felino = result.groups.find((g) => g.id === 'mamiferos').achievements[0];
  assert.equal(felino.progress, 0);
  assert.equal(felino.unlocked, false);
  assert.deepEqual(result.summary, { unlocked: 2, total: 5 }); // first + aves_2
});

test('el progreso se corta en el umbral y nunca baja', async () => {
  reset();
  capture('gorrion'); capture('pato');
  const { items } = await service.sync('yo');
  assert.equal(items.find((a) => a.code === 'first').progress, 1);
  captures = [];
  const again = await service.sync('yo');
  assert.equal(again.items.find((a) => a.code === 'aves_2').progress, 2);
});

test('si falla el cálculo, evaluate devuelve lista vacía sin romper la captura', async () => {
  reset();
  const original = Capture.countDocuments;
  Capture.countDocuments = async () => { throw new Error('mongo caído'); };
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    assert.deepEqual(await service.evaluate('yo', { _id: 'c1' }), []);
  } finally {
    Capture.countDocuments = original;
    console.warn = originalWarn;
  }
});

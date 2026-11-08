const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/achievementNotification.js');

test('sin logros no hay notificación', async () => {
  const { buildAchievementNotification } = await load();
  assert.equal(buildAchievementNotification([]), null);
  assert.equal(buildAchievementNotification(undefined), null);
});

test('un logro: título fijo y nombre en el cuerpo', async () => {
  const { buildAchievementNotification, ACHIEVEMENT_NOTIFICATION_TYPE } = await load();
  const n = buildAchievementNotification([{ code: 'aves_5', name: 'Observador de aves' }]);
  assert.equal(n.title, '¡Logro desbloqueado!');
  assert.equal(n.body, 'Observador de aves');
  assert.deepEqual(n.data, { type: ACHIEVEMENT_NOTIFICATION_TYPE, codes: ['aves_5'] });
});

test('varios logros: cantidad en el título y nombres en el cuerpo', async () => {
  const { buildAchievementNotification } = await load();
  const n = buildAchievementNotification([{ code: 'a', name: 'Uno' }, { code: 'b', name: 'Dos' }]);
  assert.equal(n.title, '¡2 logros desbloqueados!');
  assert.equal(n.body, 'Uno, Dos');
});

test('más de dos logros: se resumen para que entren en una línea', async () => {
  const { buildAchievementNotification } = await load();
  const n = buildAchievementNotification([{ code: 'a', name: 'Uno' }, { code: 'b', name: 'Dos' }, { code: 'c', name: 'Tres' }]);
  assert.equal(n.body, 'Uno, Dos y 1 más');
});

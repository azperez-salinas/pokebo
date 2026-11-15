const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/nearbyNotification.js');
const sighting = (id, commonName, zone = 'near') => ({ id, species: commonName ? { id: 's' + id, commonName } : null, zone });

test('sin avistamientos no hay notificación', async () => {
  const { buildNearbyNotification } = await load();
  assert.equal(buildNearbyNotification([]), null);
  assert.equal(buildNearbyNotification(undefined), null);
});

test('un avistamiento en la misma celda', async () => {
  const { buildNearbyNotification, NOTIFICATION_TYPE } = await load();
  const n = buildNearbyNotification([sighting('1', 'Carpincho', 'own')]);
  assert.equal(n.title, 'Carpincho cerca de vos');
  assert.equal(n.body, 'Lo vieron en tu zona.');
  assert.deepEqual(n.data, { type: NOTIFICATION_TYPE, sightingIds: ['1'] });
});

test('un avistamiento en una celda vecina', async () => {
  const { buildNearbyNotification } = await load();
  assert.equal(buildNearbyNotification([sighting('1', 'Zorro')]).body, 'Lo vieron en una zona vecina.');
});

test('varios avistamientos: nombres únicos, máximo dos y resto', async () => {
  const { buildNearbyNotification } = await load();
  const n = buildNearbyNotification([
    sighting('1', 'Zorro'), sighting('2', 'Zorro'), sighting('3', 'Ñandú'),
    sighting('4', 'Carpincho'), sighting('5', 'Hornero'),
  ]);
  assert.equal(n.title, '5 avistamientos cerca');
  assert.equal(n.body, 'Zorro, Ñandú y 2 más.');
  assert.deepEqual(n.data.sightingIds, ['1', '2', '3', '4', '5']);
});

test('especie desconocida usa un nombre genérico', async () => {
  const { buildNearbyNotification } = await load();
  assert.equal(buildNearbyNotification([sighting('1', null)]).title, 'un animal cerca de vos');
});

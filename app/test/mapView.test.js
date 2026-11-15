const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../src/utils/mapView.js');
const loadH3 = () => import('../src/utils/h3.js');

const MONTEVIDEO = { latitude: -34.9011, longitude: -56.1645 };

test('el anillo k=1 tiene 7 celdas y su rectángulo contiene el de la celda central', async () => {
  const { ringOf, boundsOf } = await load();
  const { cellOf } = await loadH3();
  const cell = cellOf(MONTEVIDEO.latitude, MONTEVIDEO.longitude);
  const ring = ringOf(cell, 1);
  assert.equal(ring.length, 7);
  const inner = boundsOf([cell]);
  const outer = boundsOf(ring);
  assert.ok(outer.north >= inner.north && outer.south <= inner.south && outer.east >= inner.east && outer.west <= inner.west);
  assert.ok(outer.east - outer.west > (inner.east - inner.west) * 2);
});

test('regionFitting mantiene la proporción de la pantalla y centra en el punto', async () => {
  const { boundsOf, regionFitting } = await load();
  const { cellOf } = await loadH3();
  const cell = cellOf(MONTEVIDEO.latitude, MONTEVIDEO.longitude);
  const bounds = boundsOf([cell]);
  const region = regionFitting(bounds, MONTEVIDEO, 2, 1);
  assert.equal(region.latitude, MONTEVIDEO.latitude);
  assert.equal(region.longitude, MONTEVIDEO.longitude);
  assert.ok(region.longitudeDelta >= bounds.east - bounds.west);
  const cos = Math.cos((MONTEVIDEO.latitude * Math.PI) / 180);
  assert.ok(Math.abs(region.latitudeDelta / (region.longitudeDelta * cos) - 2) < 1e-9);
  assert.ok(regionFitting(bounds, MONTEVIDEO, 2, 1.5).longitudeDelta > region.longitudeDelta);
});

test('zoomForLongitudeSpan: duplicar el ancho baja un nivel de zoom', async () => {
  const { zoomForLongitudeSpan } = await load();
  const a = zoomForLongitudeSpan(0.001, 360);
  const b = zoomForLongitudeSpan(0.002, 360);
  assert.ok(Math.abs(a - b - 1) < 1e-9);
  assert.ok(zoomForLongitudeSpan(360, 256) < 1e-9); // el mundo entero en 256 dp es zoom 0
});

test('cameraDistanceForLongitudeSpan crece con el ancho y baja al ensanchar el ángulo de visión', async () => {
  const { cameraDistanceForLongitudeSpan } = await load();
  const near = cameraDistanceForLongitudeSpan(0.001, -34.9, 2, 30);
  const far = cameraDistanceForLongitudeSpan(0.002, -34.9, 2, 30);
  assert.ok(Math.abs(far / near - 2) < 1e-9);
  assert.ok(cameraDistanceForLongitudeSpan(0.001, -34.9, 2, 60) < near);
  assert.ok(near > 0);
});

test('clampToBounds deja igual lo que está adentro y lleva al borde lo que está afuera', async () => {
  const { clampToBounds } = await load();
  const bounds = { north: -34.9, south: -34.91, east: -56.16, west: -56.17 };
  const inside = { latitude: -34.905, longitude: -56.165 };
  assert.deepEqual(clampToBounds(inside, bounds), inside);
  assert.deepEqual(clampToBounds({ latitude: -34.8, longitude: -56.0 }, bounds), { latitude: -34.9, longitude: -56.16 });
  assert.deepEqual(clampToBounds({ latitude: -35, longitude: -57 }, bounds), { latitude: -34.91, longitude: -56.17 });
});

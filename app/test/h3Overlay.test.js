const test = require('node:test');
const assert = require('node:assert/strict');

// La app usa módulos ES (los empaqueta Metro): desde node se cargan con import dinámico.
const loadOverlay = () => import('../src/utils/h3Overlay.js');

const MONTEVIDEO = { latitude: -34.9011, longitude: -56.1645, latitudeDelta: 0.01, longitudeDelta: 0.01 };

test('cellsForRegion cubre toda la región visible, incluidas las esquinas', async () => {
  const { cellsForRegion, cellOf } = await loadOverlay();
  const cells = cellsForRegion(MONTEVIDEO);
  assert.ok(cells.length >= 2 && cells.length <= 30, `celdas: ${cells.length}`);

  const { latitude, longitude, latitudeDelta, longitudeDelta } = MONTEVIDEO;
  for (const dLat of [-0.5, 0, 0.5]) {
    for (const dLng of [-0.5, 0, 0.5]) {
      const cell = cellOf(latitude + dLat * latitudeDelta, longitude + dLng * longitudeDelta);
      assert.ok(cells.includes(cell), `falta la celda del punto (${dLat}, ${dLng})`);
    }
  }
});

test('cellsForRegion devuelve null si el mapa está demasiado lejos o no hay región', async () => {
  const { cellsForRegion } = await loadOverlay();
  assert.equal(cellsForRegion({ ...MONTEVIDEO, latitudeDelta: 0.5, longitudeDelta: 0.5 }), null);
  assert.equal(cellsForRegion(null), null);
});

test('el zoom inicial de la app (0.08) todavía dibuja un número razonable de celdas', async () => {
  const { cellsForRegion } = await loadOverlay();
  const cells = cellsForRegion({ ...MONTEVIDEO, latitudeDelta: 0.08, longitudeDelta: 0.08 });
  assert.ok(cells && cells.length < 250, `celdas: ${cells?.length}`);
});

test('buildOverlay marca la celda del usuario, sus vecinas y cuenta avistamientos por celda', async () => {
  const { buildOverlay, cellsForRegion, cellOf, H3_RESOLUTION } = await loadOverlay();
  const h3 = await import('h3-js');
  const cells = cellsForRegion(MONTEVIDEO);
  const userCell = cellOf(MONTEVIDEO.latitude, MONTEVIDEO.longitude);
  const neighbor = h3.gridDisk(userCell, 1).find((cell) => cell !== userCell);
  const sightings = [{ h3Index: userCell }, { h3Index: userCell }, { h3Index: neighbor }];

  const overlay = buildOverlay({ cells, userCell, sightings });
  assert.equal(overlay.length, cells.length);

  const own = overlay.find((hex) => hex.id === userCell);
  assert.equal(own.isUserCell, true);
  assert.equal(own.sightings, 2);
  assert.equal(overlay.filter((hex) => hex.isUserCell).length, 1);

  const near = overlay.find((hex) => hex.id === neighbor);
  assert.equal(near.isUserCell, false);
  assert.equal(near.inUserRing, true);
  assert.equal(near.sightings, 1);

  for (const hex of overlay) {
    assert.equal(h3.getResolution(hex.id), H3_RESOLUTION);
    assert.equal(hex.coordinates.length, 6);
    assert.ok(hex.coordinates.every((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number'));
  }
});

test('buildOverlay sin celda de usuario ni avistamientos no marca nada', async () => {
  const { buildOverlay, cellsForRegion } = await loadOverlay();
  const overlay = buildOverlay({ cells: cellsForRegion(MONTEVIDEO) });
  assert.ok(overlay.every((hex) => !hex.isUserCell && !hex.inUserRing && hex.sightings === 0));
});

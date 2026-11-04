const test = require('node:test');
const assert = require('node:assert/strict');
const h3 = require('h3-js');

// --- Redis simulado en memoria (solo lo que usa location.service) ---
class FakeRedis {
  constructor() {
    this.values = new Map();
    this.sets = new Map();
    this.ttls = new Map();
  }

  async get(key) { return this.values.get(key) ?? null; }

  async set(key, value, options = {}) {
    this.values.set(key, String(value));
    if (options.expiration) this.ttls.set(key, options.expiration.value);
    return 'OK';
  }

  async del(keys) {
    let deleted = 0;
    for (const key of [keys].flat()) {
      deleted += Number(this.values.delete(key)) + Number(this.sets.delete(key));
      this.ttls.delete(key);
    }
    return deleted;
  }

  async sAdd(key, member) {
    const set = this.sets.get(key) || new Set();
    const before = set.size;
    set.add(member);
    this.sets.set(key, set);
    return set.size - before;
  }

  async expire(key, seconds) { this.ttls.set(key, seconds); return 1; }
}

// --- Modelos simulados: User y Sighting con las consultas que usan los servicios ---
const users = new Map();
let sightings = [];

const User = {
  findById(id) {
    const user = users.get(String(id)) || null;
    const query = { select: () => query, lean: async () => user };
    return query;
  },
};

const Sighting = {
  find(filter) {
    let result = sightings.filter((s) => (
      filter.h3Index.$in.includes(s.h3Index)
      && s.expiresAt > filter.expiresAt.$gt
      && (!filter.user || String(s.user) !== String(filter.user.$ne))
    ));
    const query = {
      sort: () => { result = [...result].sort((a, b) => b.seenAt - a.seenAt); return query; },
      limit: (n) => { result = result.slice(0, n); return query; },
      populate: () => query,
      lean: async () => result,
    };
    return query;
  },
};

const fakeRedis = new FakeRedis();
const inject = (path, exports) => {
  const resolved = require.resolve(path);
  require.cache[resolved] = { id: resolved, filename: resolved, loaded: true, exports };
};
inject('../src/config/redis', { redisClient: fakeRedis });
inject('../src/models/User.model', User);
inject('../src/models/Sighting.model', Sighting);

const locationService = require('../src/services/location.service');
const sightingsService = require('../src/services/sightings.service');

// Celdas de prueba: el centro, una vecina directa y una a dos anillos
const { H3_RESOLUTION } = require('../src/utils/h3');
const CENTER = h3.latLngToCell(-34.9011, -56.1645, H3_RESOLUTION);
const NEIGHBOR = h3.gridDisk(CENTER, 1).find((cell) => cell !== CENTER);
const RING2 = h3.gridDisk(CENTER, 2).find((cell) => !h3.gridDisk(CENTER, 1).includes(cell));

let counter = 0;
function addSighting({ h3Index, user = 'otro', expiresInMs = 60 * 60 * 1000, commonName = 'Carpincho' }) {
  counter += 1;
  const [lat, lng] = h3.cellToLatLng(h3Index);
  const sighting = {
    _id: `s${counter}`,
    species: { _id: `sp${counter}`, commonName },
    capture: `c${counter}`,
    user,
    location: { type: 'Point', coordinates: [lng, lat] },
    h3Index,
    seenAt: new Date(Date.now() - counter * 1000),
    expiresAt: new Date(Date.now() + expiresInMs),
  };
  sightings.push(sighting);
  return sighting;
}

function reset({ nearbyAlerts = true } = {}) {
  fakeRedis.values.clear();
  fakeRedis.sets.clear();
  fakeRedis.ttls.clear();
  sightings = [];
  users.clear();
  users.set('yo', { _id: 'yo', settings: { nearbyAlerts } });
}

test('rechaza celdas inválidas o de otra resolución con 400 INVALID_H3_CELL', async () => {
  reset();
  const otraResolucion = h3.latLngToCell(-34.9011, -56.1645, H3_RESOLUTION + 1);
  for (const invalida of ['basura', '', '8828308281fffff0', otraResolucion, null]) {
    await assert.rejects(
      () => locationService.reportLocation('yo', invalida),
      (err) => err.status === 400 && err.code === 'INVALID_H3_CELL',
    );
  }
  assert.equal(fakeRedis.values.size, 0);
});

test('guarda la celda del usuario con TTL de 1 hora y devuelve nearby vacío si no hay nada', async () => {
  reset();
  const result = await locationService.reportLocation('yo', CENTER);
  assert.deepEqual(result, { nearby: [] });
  assert.equal(fakeRedis.values.get('user:cell:yo'), CENTER);
  assert.equal(fakeRedis.ttls.get('user:cell:yo'), 3600);
});

test('usuario inexistente: 404 y no guarda nada', async () => {
  reset();
  await assert.rejects(
    () => locationService.reportLocation('fantasma', CENTER),
    (err) => err.status === 404 && err.code === 'USER_NOT_FOUND',
  );
  assert.equal(fakeRedis.values.size, 0);
});

test('con nearbyAlerts apagado guarda la celda pero no devuelve avistamientos', async () => {
  reset({ nearbyAlerts: false });
  addSighting({ h3Index: CENTER });
  const result = await locationService.reportLocation('yo', CENTER);
  assert.deepEqual(result, { nearby: [] });
  assert.equal(fakeRedis.values.get('user:cell:yo'), CENTER);
  assert.equal(fakeRedis.sets.size, 0);
});

test('avisa avistamientos de otros: celda propia (own), vecina (near) y no a dos anillos', async () => {
  reset();
  const propia = addSighting({ h3Index: CENTER, commonName: 'Carpincho' });
  const vecina = addSighting({ h3Index: NEIGHBOR, commonName: 'Zorro' });
  addSighting({ h3Index: RING2, commonName: 'Lejano' });

  const { nearby } = await locationService.reportLocation('yo', CENTER);
  assert.equal(nearby.length, 2);
  const own = nearby.find((n) => n.id === propia._id);
  const near = nearby.find((n) => n.id === vecina._id);
  assert.equal(own.zone, 'own');
  assert.equal(own.ringDistance, 0);
  assert.equal(own.species.commonName, 'Carpincho');
  assert.equal(near.zone, 'near');
  assert.equal(near.ringDistance, 1);
  assert.equal(nearby.some((n) => n.species.commonName === 'Lejano'), false);
  // la respuesta de aviso no expone usuario, captura ni coordenadas
  assert.deepEqual(Object.keys(own).sort(), ['h3Index', 'id', 'ringDistance', 'seenAt', 'species', 'zone']);
});

test('no avisa los avistamientos propios ni los vencidos', async () => {
  reset();
  addSighting({ h3Index: CENTER, user: 'yo' });
  addSighting({ h3Index: CENTER, expiresInMs: -1000 });
  const { nearby } = await locationService.reportLocation('yo', CENTER);
  assert.deepEqual(nearby, []);
});

test('no repite el aviso del mismo avistamiento; si se borra el set vuelve a avisar', async () => {
  reset();
  addSighting({ h3Index: CENTER });
  assert.equal((await locationService.reportLocation('yo', CENTER)).nearby.length, 1);
  assert.equal(fakeRedis.ttls.get('seen:yo'), 86400);

  assert.equal((await locationService.reportLocation('yo', CENTER)).nearby.length, 0);
  assert.equal((await locationService.reportLocation('yo', NEIGHBOR)).nearby.length, 0);

  await fakeRedis.del('seen:yo');
  assert.equal((await locationService.reportLocation('yo', CENTER)).nearby.length, 1);
});

test('dos pedidos en paralelo no avisan dos veces el mismo avistamiento', async () => {
  reset();
  addSighting({ h3Index: CENTER });
  const [a, b] = await Promise.all([
    locationService.reportLocation('yo', CENTER),
    locationService.reportLocation('yo', CENTER),
  ]);
  assert.equal(a.nearby.length + b.nearby.length, 1);
});

test('deleteLocation borra la celda y los avisos vistos del usuario', async () => {
  reset();
  addSighting({ h3Index: CENTER });
  await locationService.reportLocation('yo', CENTER);
  assert.ok(fakeRedis.values.has('user:cell:yo') && fakeRedis.sets.has('seen:yo'));
  await locationService.deleteLocation('yo');
  assert.equal(fakeRedis.values.has('user:cell:yo'), false);
  assert.equal(fakeRedis.sets.has('seen:yo'), false);
});

test('listNear por h3Index y por lat/lng; k=2 trae más celdas; excluye al usuario pedido', async () => {
  reset();
  addSighting({ h3Index: CENTER, user: 'otro' });
  addSighting({ h3Index: CENTER, user: 'yo' });
  addSighting({ h3Index: RING2, user: 'otro' });

  const porCelda = await sightingsService.listNear({ h3Index: CENTER, k: 1 });
  assert.equal(porCelda.length, 2); // incluye el propio si nadie lo excluye

  const sinPropios = await sightingsService.listNear({ h3Index: CENTER, k: 1 }, { excludeUserId: 'yo' });
  assert.equal(sinPropios.length, 1);

  const [lat, lng] = h3.cellToLatLng(CENTER);
  const porPunto = await sightingsService.listNear({ lat, lng, k: 1 }, { excludeUserId: 'yo' });
  assert.equal(porPunto.length, 1);

  const conK2 = await sightingsService.listNear({ h3Index: CENTER, k: 2 }, { excludeUserId: 'yo' });
  assert.equal(conK2.length, 2);

  assert.deepEqual(Object.keys(porCelda[0]).sort(), ['expiresAt', 'h3Index', 'id', 'location', 'seenAt', 'species']);
  assert.deepEqual(Object.keys(porCelda[0].location).sort(), ['lat', 'lng']);

  await assert.rejects(
    () => sightingsService.listNear({ h3Index: 'basura' }),
    (err) => err.status === 400 && err.code === 'INVALID_H3_CELL',
  );
});

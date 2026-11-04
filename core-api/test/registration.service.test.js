const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REGISTRATION_CODE_PEPPER = 'test-only-registration-pepper-with-enough-entropy';

class FakeRedis {
  constructor() {
    this.values = new Map();
    this.hashes = new Map();
  }

  async incr(key) {
    const value = Number(this.values.get(key) || 0) + 1;
    this.values.set(key, String(value));
    return value;
  }

  async expire() { return 1; }
  async get(key) { return this.values.get(key) || null; }

  async set(key, value, options = {}) {
    if ((options.condition === 'NX' || options.NX) && this.values.has(key)) return null;
    this.values.set(key, String(value));
    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;
    keys.flat().forEach((key) => {
      deleted += Number(this.values.delete(key));
      deleted += Number(this.hashes.delete(key));
    });
    return deleted;
  }

  async hGetAll(key) { return { ...(this.hashes.get(key) || {}) }; }

  async hSet(key, fields) {
    this.hashes.set(key, { ...(this.hashes.get(key) || {}), ...fields });
    return Object.keys(fields).length;
  }

  async hIncrBy(key, field, increment) {
    const hash = { ...(this.hashes.get(key) || {}) };
    hash[field] = String(Number(hash[field] || 0) + increment);
    this.hashes.set(key, hash);
    return Number(hash[field]);
  }

  async eval(script, { keys, arguments: args }) {
    if (this.values.get(keys[0]) === args[0]) return this.del(keys[0]);
    return 0;
  }

  multi() {
    const operations = [];
    const chain = {
      del: (...args) => { operations.push(() => this.del(...args)); return chain; },
      hSet: (...args) => { operations.push(() => this.hSet(...args)); return chain; },
      hIncrBy: (...args) => { operations.push(() => this.hIncrBy(...args)); return chain; },
      expire: (...args) => { operations.push(() => this.expire(...args)); return chain; },
      set: (...args) => { operations.push(() => this.set(...args)); return chain; },
      exec: async () => Promise.all(operations.map((operation) => operation())),
    };
    return chain;
  }
}

const fakeRedis = new FakeRedis();
const users = [];
const User = {
  async exists(query) {
    const found = users.find((user) => Object.entries(query).every(([key, value]) => user[key] === value));
    return found ? { _id: found._id } : null;
  },
  async create(fields) {
    const user = {
      _id: String(users.length + 1),
      ...fields,
      toObject() { return { ...this }; },
    };
    users.push(user);
    return user;
  },
};

require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'),
  filename: require.resolve('../src/config/redis'),
  loaded: true,
  exports: { redisClient: fakeRedis },
};
require.cache[require.resolve('../src/models/User.model')] = {
  id: require.resolve('../src/models/User.model'),
  filename: require.resolve('../src/models/User.model'),
  loaded: true,
  exports: User,
};
require.cache[require.resolve('../src/services/token.service')] = {
  id: require.resolve('../src/services/token.service'),
  filename: require.resolve('../src/services/token.service'),
  loaded: true,
  exports: { issueTokens: async () => ({ accessToken: 'access', refreshToken: 'refresh' }) },
};

const registration = require('../src/services/registration.service');

test('crea el usuario y emite tokens solamente despues de verificar el codigo', async () => {
  const started = await registration.start({
    username: 'explorador',
    email: 'Persona@Correo.com',
    password: 'password-segura',
  });

  assert.equal(started.public.expiresIn, 300);
  assert.equal(started.public.resendAfter, 60);
  assert.equal(users.length, 0);
  assert.equal(started.delivery.email, 'persona@correo.com');
  const stored = fakeRedis.hashes.get(`registration:challenge:${started.public.challengeId}`);
  assert.notEqual(stored.codeHash, started.delivery.code);
  assert.equal(stored.passwordHash.includes('password-segura'), false);

  const result = await registration.verify(started.public.challengeId, started.delivery.code);
  assert.equal(users.length, 1);
  assert.ok(users[0].emailVerifiedAt instanceof Date);
  assert.equal(result.accessToken, 'access');
  assert.equal(result.refreshToken, 'refresh');
});

test('un correo existente recibe la misma respuesta publica pero nunca un codigo utilizable', async () => {
  const started = await registration.start({
    username: 'otro-explorador',
    email: 'persona@correo.com',
    password: 'otra-password-segura',
  });

  assert.equal(started.public.expiresIn, 300);
  assert.equal(started.delivery, null);
  await assert.rejects(
    registration.verify(started.public.challengeId, 'ABC234'),
    (error) => error.code === 'INVALID_VERIFICATION_CODE',
  );
  assert.equal(users.length, 1);
});

test('reenviar reemplaza el codigo anterior y reinicia la validez', async () => {
  const started = await registration.start({
    username: 'tercer-explorador',
    email: 'tercero@correo.com',
    password: 'tercera-password-segura',
  });
  const key = `registration:challenge:${started.public.challengeId}`;
  fakeRedis.hashes.get(key).lastSentAt = String(Date.now() - 61_000);

  const resent = await registration.resend(started.public.challengeId);
  assert.notEqual(resent.delivery.code, started.delivery.code);
  await assert.rejects(
    registration.verify(started.public.challengeId, started.delivery.code),
    (error) => error.code === 'INVALID_VERIFICATION_CODE',
  );
  const result = await registration.verify(started.public.challengeId, resent.delivery.code);
  assert.equal(result.accessToken, 'access');
});

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');

process.env.LOGIN_CODE_PEPPER = 'test-only-login-pepper-with-enough-entropy';

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
let issuedSessions = 0;
const user = {
  _id: 'user-1',
  username: 'explorador',
  email: 'persona@correo.com',
  passwordHash: bcrypt.hashSync('password-segura', 10),
  lastLoginAt: null,
  async save() { return this; },
  toObject() { return { ...this }; },
};

const User = {
  async findOne(query) { return query.username === user.username ? user : null; },
  async findById(id) { return String(id) === String(user._id) ? user : null; },
};

require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'), filename: require.resolve('../src/config/redis'),
  loaded: true, exports: { redisClient: fakeRedis },
};
require.cache[require.resolve('../src/models/User.model')] = {
  id: require.resolve('../src/models/User.model'), filename: require.resolve('../src/models/User.model'),
  loaded: true, exports: User,
};
require.cache[require.resolve('../src/services/token.service')] = {
  id: require.resolve('../src/services/token.service'), filename: require.resolve('../src/services/token.service'),
  loaded: true,
  exports: {
    issueTokens: async () => {
      issuedSessions += 1;
      return { accessToken: 'access', refreshToken: 'refresh' };
    },
  },
};

const loginVerification = require('../src/services/login-verification.service');

test.beforeEach(() => {
  fakeRedis.values.clear();
  fakeRedis.hashes.clear();
  issuedSessions = 0;
  user.lastLoginAt = null;
});

test('usuario y contraseña correctos crean un desafío pero no una sesión', async () => {
  const started = await loginVerification.start({ username: user.username, password: 'password-segura' });

  assert.equal(started.public.expiresIn, 300);
  assert.equal(started.delivery.purpose, 'login');
  assert.equal(started.delivery.email, user.email);
  assert.equal(issuedSessions, 0);
  const stored = fakeRedis.hashes.get(`login:challenge:${started.public.challengeId}`);
  assert.equal(stored.userId, user._id);
  assert.equal(Object.hasOwn(stored, 'email'), false);
  assert.notEqual(stored.codeHash, started.delivery.code);
});

test('emite tokens solamente después del código correcto y lo consume una vez', async () => {
  const started = await loginVerification.start({ username: user.username, password: 'password-segura' });
  const result = await loginVerification.verify(started.public.challengeId, started.delivery.code);

  assert.equal(result.accessToken, 'access');
  assert.equal(result.refreshToken, 'refresh');
  assert.equal(issuedSessions, 1);
  assert.ok(user.lastLoginAt instanceof Date);
  await assert.rejects(
    loginVerification.verify(started.public.challengeId, started.delivery.code),
    (error) => error.code === 'INVALID_LOGIN_CODE',
  );
  assert.equal(issuedSessions, 1);
});

test('credenciales incorrectas no crean desafío ni envían correo', async () => {
  await assert.rejects(
    loginVerification.start({ username: user.username, password: 'incorrecta' }),
    (error) => error.code === 'INVALID_CREDENTIALS',
  );
  assert.equal(fakeRedis.hashes.size, 0);
  assert.equal(issuedSessions, 0);
});

test('reenviar invalida el código anterior y permite verificar el nuevo', async () => {
  const started = await loginVerification.start({ username: user.username, password: 'password-segura' });
  const key = `login:challenge:${started.public.challengeId}`;
  fakeRedis.hashes.get(key).lastSentAt = String(Date.now() - 61_000);

  const resent = await loginVerification.resend(started.public.challengeId);
  assert.notEqual(resent.delivery.code, started.delivery.code);
  await assert.rejects(
    loginVerification.verify(started.public.challengeId, started.delivery.code),
    (error) => error.code === 'INVALID_LOGIN_CODE',
  );
  const result = await loginVerification.verify(started.public.challengeId, resent.delivery.code);
  assert.equal(result.accessToken, 'access');
});

test('un nuevo inicio invalida cualquier desafío anterior del mismo usuario', async () => {
  const first = await loginVerification.start({ username: user.username, password: 'password-segura' });
  const second = await loginVerification.start({ username: user.username, password: 'password-segura' });

  await assert.rejects(
    loginVerification.verify(first.public.challengeId, first.delivery.code),
    (error) => error.code === 'INVALID_LOGIN_CODE',
  );
  const result = await loginVerification.verify(second.public.challengeId, second.delivery.code);
  assert.equal(result.accessToken, 'access');
  assert.equal(issuedSessions, 1);
});

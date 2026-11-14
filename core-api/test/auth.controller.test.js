const test = require('node:test');
const assert = require('node:assert/strict');

const controllerPath = require.resolve('../src/controllers/auth.controller');
const dependencyPaths = {
  auth: require.resolve('../src/services/auth.service'),
  registration: require.resolve('../src/services/registration.service'),
  login: require.resolve('../src/services/login-verification.service'),
  publisher: require.resolve('../src/services/otp-email-publisher.service'),
  config: require.resolve('../src/config'),
};

function mockModule(path, exports) {
  require.cache[path] = { id: path, filename: path, loaded: true, exports };
}

function loadController(overrides = {}) {
  const saved = new Map([controllerPath, ...Object.values(dependencyPaths)].map((path) => [path, require.cache[path]]));
  delete require.cache[controllerPath];

  mockModule(dependencyPaths.auth, overrides.auth || {});
  mockModule(dependencyPaths.registration, overrides.registration || {});
  mockModule(dependencyPaths.login, overrides.login || {});
  mockModule(dependencyPaths.publisher, overrides.publisher || { enqueue: async () => {} });
  mockModule(dependencyPaths.config, { otpResponseMinMs: 0 });

  const controller = require(controllerPath);
  return {
    controller,
    restore() {
      for (const [path, value] of saved) {
        if (value) require.cache[path] = value;
        else delete require.cache[path];
      }
    },
  };
}

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('startRegistration encola el OTP y responde únicamente con el objeto público', async () => {
  const delivery = { purpose: 'registration', email: 'user@example.com', code: 'ABC123', expiresIn: 300 };
  const published = [];
  const fixture = loadController({
    registration: { start: async () => ({ public: { challengeId: 'challenge-1' }, delivery }) },
    publisher: { enqueue: async (value) => published.push(value) },
  });

  try {
    const res = responseRecorder();
    await fixture.controller.startRegistration({ body: {} }, res, assert.fail);

    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, { challengeId: 'challenge-1' });
    assert.deepEqual(published, [delivery]);
    assert.equal(Object.hasOwn(res.body, 'delivery'), false);
  } finally {
    fixture.restore();
  }
});

test('un fallo de SQS mantiene la respuesta genérica y no registra correo, OTP ni detalle del error', async () => {
  const delivery = { purpose: 'password-reset', email: 'secret@example.com', code: '654321', expiresIn: 900 };
  const fixture = loadController({
    auth: { forgotPassword: async () => ({ public: { message: 'Si la cuenta existe, se enviará un código' }, delivery }) },
    publisher: { enqueue: async () => { throw new Error('respuesta privada del proveedor'); } },
  });
  const originalError = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);

  try {
    const res = responseRecorder();
    await fixture.controller.forgotPassword({ body: { usernameOrEmail: 'secret@example.com' } }, res, assert.fail);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { message: 'Si la cuenta existe, se enviará un código' });
    const serialized = JSON.stringify(logs);
    assert.equal(serialized.includes('secret@example.com'), false);
    assert.equal(serialized.includes('654321'), false);
    assert.equal(serialized.includes('respuesta privada del proveedor'), false);
  } finally {
    console.error = originalError;
    fixture.restore();
  }
});

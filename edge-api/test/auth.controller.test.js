const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REGISTRATION_RESPONSE_MIN_MS = '1';

let coreResponse;
let delivered;
let deliveryError = null;

const forwardPath = require.resolve('../src/services/forward.service');
require.cache[forwardPath] = {
  id: forwardPath,
  filename: forwardPath,
  loaded: true,
  exports: { reenviarACore: async () => coreResponse },
};
const mailPath = require.resolve('../src/services/mail.service');
require.cache[mailPath] = {
  id: mailPath,
  filename: mailPath,
  loaded: true,
  exports: {
    sendCodeEmail: async (delivery) => {
      delivered = delivery;
      if (deliveryError) throw deliveryError;
    },
  },
};

const controller = require('../src/controllers/auth.controller');

function responseDouble() {
  return {
    statusCode: null,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
  };
}

test('envia el correo pero nunca expone la orden interna al cliente', async () => {
  const publicBody = { challengeId: 'challenge', expiresIn: 300, resendAfter: 60 };
  const delivery = { email: 'persona@correo.com', code: 'A7K3PX' };
  coreResponse = { status: 202, data: { public: publicBody, delivery } };
  delivered = null;
  deliveryError = null;
  const response = responseDouble();

  await controller.forwardWithEmailDelivery(
    { originalUrl: '/api/v1/auth/registrations', method: 'POST', body: {}, headers: {} },
    response,
    assert.fail,
  );

  assert.deepEqual(delivered, delivery);
  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.body, publicBody);
  assert.equal(Object.hasOwn(response.body, 'delivery'), false);
});

test('una falla del proveedor no cambia la respuesta publica', async () => {
  const publicBody = { challengeId: 'challenge', expiresIn: 300, resendAfter: 60 };
  coreResponse = {
    status: 202,
    data: { public: publicBody, delivery: { email: 'persona@correo.com', code: 'A7K3PX' } },
  };
  deliveryError = new Error('provider unavailable');
  const response = responseDouble();
  const originalError = console.error;
  console.error = () => {};
  try {
    await controller.forwardWithEmailDelivery(
      { originalUrl: '/api/v1/auth/registrations', method: 'POST', body: {}, headers: {} },
      response,
      assert.fail,
    );
  } finally {
    console.error = originalError;
    deliveryError = null;
  }

  assert.equal(response.statusCode, 202);
  assert.deepEqual(response.body, publicBody);
});

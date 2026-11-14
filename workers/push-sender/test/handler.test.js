const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createHandler } = require('../src/handler');
const { createFcmClient } = require('../src/fcm');

const NOW = Date.parse('2026-11-13T12:00:10.000Z');
const message = (over = {}) => ({
  schemaVersion: 1, type: 'pokebo.push.requested', deliveryId: '33333333-3333-4333-8333-333333333333',
  createdAt: '2026-11-13T12:00:00.000Z', ttlSeconds: 3600, category: 'nearby', userId: 'u1',
  tokens: [{ token: 'ok', platform: 'android' }, { token: 'bad', platform: 'android' }, { token: 'apns', platform: 'ios' }],
  notification: { title: 'T', body: 'B' }, data: { type: 'nearby' }, ...over,
});

function setup({ fcmSend, claimed = false } = {}) {
  const dynamo = [];
  const sqs = [];
  const sent = [];
  const handler = createHandler({
    now: () => NOW,
    tableName: 'idem',
    feedbackQueueUrl: 'q-feedback',
    dynamoClient: {
      send: async (command) => {
        dynamo.push(command.constructor.name);
        if (claimed && command.constructor.name === 'PutItemCommand') {
          throw Object.assign(new Error('x'), { name: 'ConditionalCheckFailedException' });
        }
      },
    },
    sqsClient: { send: async (command) => sqs.push(JSON.parse(command.input.MessageBody)) },
    fcmClient: {
      send: fcmSend || (async (request) => {
        sent.push(request.token);
        return request.token === 'bad' ? { ok: false, invalidToken: true } : { ok: true };
      }),
    },
  });
  return { handler, dynamo, sqs, sent };
}
const event = (body) => ({ Records: [{ messageId: 'm1', body: JSON.stringify(body) }] });

test('envía a Android, ignora iOS y reporta tokens inválidos', async () => {
  const { handler, sqs, sent, dynamo } = setup();
  assert.deepEqual(await handler(event(message())), { batchItemFailures: [] });
  assert.deepEqual(sent, ['ok', 'bad']);
  assert.deepEqual(sqs[0], {
    schemaVersion: 1, type: 'pokebo.push-token-invalid', userId: 'u1', tokens: ['bad'], reportedAt: '2026-11-13T12:00:10.000Z',
  });
  assert.deepEqual(dynamo, ['PutItemCommand', 'UpdateItemCommand']);
});

test('un deliveryId ya reclamado no vuelve a enviar', async () => {
  const { handler, sent } = setup({ claimed: true });
  assert.deepEqual(await handler(event(message())), { batchItemFailures: [] });
  assert.equal(sent.length, 0);
});

test('un error recuperable libera la marca y devuelve fallo parcial', async () => {
  const { handler, dynamo } = setup({
    fcmSend: async () => { throw Object.assign(new Error('x'), { name: 'FcmError', status: 503 }); },
  });
  assert.deepEqual(await handler(event(message())), { batchItemFailures: [{ itemIdentifier: 'm1' }] });
  assert.deepEqual(dynamo, ['PutItemCommand', 'DeleteItemCommand']);
});

test('descarta push expirado y los contratos inválidos van a fallo parcial', async () => {
  const { handler, dynamo } = setup();
  assert.deepEqual(await handler(event(message({ ttlSeconds: 5 }))), { batchItemFailures: [] });
  assert.equal(dynamo.length, 0);
  assert.deepEqual(await handler(event({ nada: true })), { batchItemFailures: [{ itemIdentifier: 'm1' }] });
});

test('FCM: UNREGISTERED es token inválido y 503 es recuperable', async () => {
  const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const account = { project_id: 'p', client_email: 'a@p.iam', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
  const oauth = { ok: true, json: async () => ({ access_token: 'tok', expires_in: 3600 }) };
  const request = { token: 't', notification: {}, data: {}, ttlSeconds: 60 };

  const unregistered = async (url) => (url.includes('oauth2')
    ? oauth
    : { ok: false, status: 404, json: async () => ({ error: { status: 'NOT_FOUND', details: [{ errorCode: 'UNREGISTERED' }] } }) });
  assert.equal((await createFcmClient({ account, fetchImpl: unregistered, now: () => NOW }).send(request)).invalidToken, true);

  const unavailable = async (url) => (url.includes('oauth2') ? oauth : { ok: false, status: 503, json: async () => ({}) });
  await assert.rejects(createFcmClient({ account, fetchImpl: unavailable, now: () => NOW }).send(request), { name: 'FcmError' });
});

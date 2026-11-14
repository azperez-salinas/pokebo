const test = require('node:test');
const assert = require('node:assert/strict');
const publisher = require('../src/services/push-publisher.service');

test('enqueue publica un contrato versionado con data en strings', async () => {
  const commands = [];
  await publisher.enqueue({
    userId: 'u1', category: 'nearby', title: 'Zorro cerca de vos', body: 'Nuevo avistamiento',
    tokens: [{ token: 'tk', platform: 'android' }], data: { n: 1, sightingId: 's1', nada: null },
  }, {
    client: { send: async (c) => commands.push(c) },
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/123456789012/push',
    deliveryId: '22222222-2222-4222-8222-222222222222',
    now: new Date('2026-11-13T12:00:00.000Z'),
  });
  assert.deepEqual(JSON.parse(commands[0].input.MessageBody), {
    schemaVersion: 1, type: 'pokebo.push.requested',
    deliveryId: '22222222-2222-4222-8222-222222222222', createdAt: '2026-11-13T12:00:00.000Z',
    ttlSeconds: 3600, category: 'nearby', userId: 'u1',
    tokens: [{ token: 'tk', platform: 'android' }],
    notification: { title: 'Zorro cerca de vos', body: 'Nuevo avistamiento' },
    data: { n: '1', sightingId: 's1' },
  });
});

test('rechaza pedidos inválidos antes de llamar a SQS', async () => {
  const client = { send: async () => assert.fail('no debe publicar') };
  const base = { userId: 'u1', category: 'nearby', title: 't', body: 'b', tokens: [{ token: 'a', platform: 'android' }] };
  for (const bad of [{ category: 'otra' }, { tokens: [] }, { title: '' }, { userId: null }]) {
    await assert.rejects(publisher.enqueue({ ...base, ...bad }, { client, queueUrl: 'q' }), TypeError);
  }
});

test('deliverableTokens filtra iOS, vacíos y repetidos', () => {
  assert.deepEqual(publisher.deliverableTokens([
    { token: 'a', platform: 'android' }, { token: 'a', platform: 'android' },
    { token: 'b', platform: 'ios' }, { token: ' ', platform: 'android' }, null,
  ]), [{ token: 'a', platform: 'android' }]);
});

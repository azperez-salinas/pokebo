const test = require('node:test');
const assert = require('node:assert/strict');
const { createHandler } = require('../src/handler');

const NOW = Date.parse('2026-11-13T12:05:00.000Z');

function sqsRecord(overrides = {}) {
  return {
    messageId: overrides.messageId || 'message-1',
    body: JSON.stringify({
      schemaVersion: 1,
      type: 'pokebo.otp-email.requested',
      deliveryId: '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-11-13T12:00:00.000Z',
      purpose: 'registration',
      to: 'user@example.com',
      code: 'ABC123',
      expiresInSeconds: 600,
      ...overrides.body,
    }),
  };
}

test('envía con SES y marca la entrega como SENT', async () => {
  const dynamoCommands = [];
  const sesCommands = [];
  const handler = createHandler({
    tableName: 'idempotency',
    fromAddress: 'sender@example.com',
    now: () => NOW,
    dynamoClient: { send: async (command) => dynamoCommands.push(command) },
    sesClient: { send: async (command) => sesCommands.push(command) },
  });

  assert.deepEqual(await handler({ Records: [sqsRecord()] }), { batchItemFailures: [] });
  assert.deepEqual(dynamoCommands.map((command) => command.constructor.name), ['PutItemCommand', 'UpdateItemCommand']);
  assert.equal(sesCommands[0].constructor.name, 'SendEmailCommand');
  assert.deepEqual(sesCommands[0].input.Destination.ToAddresses, ['user@example.com']);
});

test('un deliveryId ya reclamado se considera procesado y no vuelve a enviar', async () => {
  let sesCalls = 0;
  const duplicate = Object.assign(new Error('duplicate'), { name: 'ConditionalCheckFailedException' });
  const handler = createHandler({
    tableName: 'idempotency',
    fromAddress: 'sender@example.com',
    now: () => NOW,
    dynamoClient: { send: async () => { throw duplicate; } },
    sesClient: { send: async () => { sesCalls += 1; } },
  });

  assert.deepEqual(await handler({ Records: [sqsRecord()] }), { batchItemFailures: [] });
  assert.equal(sesCalls, 0);
});

test('un fallo de SES libera la marca y devuelve fallo parcial a SQS', async () => {
  const dynamoCommands = [];
  const handler = createHandler({
    tableName: 'idempotency',
    fromAddress: 'sender@example.com',
    now: () => NOW,
    dynamoClient: { send: async (command) => dynamoCommands.push(command) },
    sesClient: { send: async () => { throw new Error('SES no disponible'); } },
  });

  assert.deepEqual(await handler({ Records: [sqsRecord()] }), {
    batchItemFailures: [{ itemIdentifier: 'message-1' }],
  });
  assert.deepEqual(dynamoCommands.map((command) => command.constructor.name), ['PutItemCommand', 'DeleteItemCommand']);
});

test('descarta un OTP expirado sin usar DynamoDB ni SES', async () => {
  let calls = 0;
  const handler = createHandler({
    tableName: 'idempotency',
    fromAddress: 'sender@example.com',
    now: () => NOW,
    dynamoClient: { send: async () => { calls += 1; } },
    sesClient: { send: async () => { calls += 1; } },
  });

  const expired = sqsRecord({ body: { expiresInSeconds: 60 } });
  assert.deepEqual(await handler({ Records: [expired] }), { batchItemFailures: [] });
  assert.equal(calls, 0);
});

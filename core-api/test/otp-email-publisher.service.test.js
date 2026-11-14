const test = require('node:test');
const assert = require('node:assert/strict');

const publisher = require('../src/services/otp-email-publisher.service');

test('enqueue publica un contrato versionado y normaliza el destinatario', async () => {
  const commands = [];
  const client = { send: async (command) => commands.push(command) };
  const now = new Date('2026-11-13T12:00:00.000Z');

  const result = await publisher.enqueue({
    purpose: 'registration',
    email: '  Usuario@Example.com ',
    code: 'A1B2C3',
    expiresIn: 300,
  }, {
    client,
    queueUrl: 'https://sqs.us-east-2.amazonaws.com/123456789012/pokebo-email',
    deliveryId: '11111111-1111-4111-8111-111111111111',
    now,
  });

  assert.deepEqual(result, { deliveryId: '11111111-1111-4111-8111-111111111111' });
  assert.equal(commands.length, 1);
  assert.equal(commands[0].constructor.name, 'SendMessageCommand');
  assert.deepEqual(JSON.parse(commands[0].input.MessageBody), {
    schemaVersion: 1,
    type: 'pokebo.otp-email.requested',
    deliveryId: '11111111-1111-4111-8111-111111111111',
    createdAt: '2026-11-13T12:00:00.000Z',
    purpose: 'registration',
    to: 'usuario@example.com',
    code: 'A1B2C3',
    expiresInSeconds: 300,
  });
});

test('enqueue rechaza destinatarios y propósitos inválidos antes de llamar a SQS', async () => {
  let calls = 0;
  const client = { send: async () => { calls += 1; } };

  await assert.rejects(
    publisher.enqueue({ purpose: 'otro', email: 'invalido', code: '123456', expiresIn: 300 }, {
      client,
      queueUrl: 'queue-url',
    }),
    TypeError,
  );

  assert.equal(calls, 0);
});

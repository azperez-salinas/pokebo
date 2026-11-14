const test = require('node:test');
const assert = require('node:assert/strict');

const updates = [];
const modelPath = require.resolve('../src/models/User.model');
require.cache[modelPath] = {
  id: modelPath,
  filename: modelPath,
  loaded: true,
  exports: { updateOne: async (...args) => { updates.push(args); return { modifiedCount: 1 }; } },
};

const feedback = require('../src/services/push-feedback.service');

const body = (over = {}) => JSON.stringify({
  schemaVersion: 1, type: 'pokebo.push-token-invalid', userId: 'u1', tokens: ['a', 'b'], ...over,
});

test('retira del usuario los tokens rechazados y borra el mensaje de la cola', async () => {
  updates.length = 0;
  const commands = [];
  const client = {
    send: async (command) => {
      commands.push(command.constructor.name);
      return command.constructor.name === 'ReceiveMessageCommand'
        ? { Messages: [{ Body: body(), ReceiptHandle: 'r1' }] }
        : {};
    },
  };
  assert.equal(await feedback.pollOnce({ client, queueUrl: 'q' }), 1);
  assert.deepEqual(updates[0], [{ _id: 'u1' }, { $pull: { pushTokens: { token: { $in: ['a', 'b'] } } } }]);
  assert.deepEqual(commands, ['ReceiveMessageCommand', 'DeleteMessageCommand']);
});

test('un mensaje malformado se descarta sin tocar Mongo', async () => {
  updates.length = 0;
  for (const bad of ['no es json', body({ type: 'otro' }), body({ tokens: 'x' }), body({ tokens: [] }), body({ userId: '' })]) {
    assert.equal(feedback.parseFeedback(bad), null);
  }
  assert.equal(await feedback.processMessage({ Body: 'no es json' }), 0);
  assert.equal(updates.length, 0);
});

test('si Mongo falla no se borra el mensaje (reaparece para reintentar)', async () => {
  const commands = [];
  const client = {
    send: async (command) => {
      commands.push(command.constructor.name);
      return { Messages: [{ Body: body(), ReceiptHandle: 'r1' }] };
    },
  };
  const original = require('../src/models/User.model').updateOne;
  require('../src/models/User.model').updateOne = async () => { throw new Error('mongo caído'); };
  try {
    await assert.rejects(feedback.pollOnce({ client, queueUrl: 'q' }), /mongo caído/);
  } finally {
    require('../src/models/User.model').updateOne = original;
  }
  assert.deepEqual(commands, ['ReceiveMessageCommand']);
});

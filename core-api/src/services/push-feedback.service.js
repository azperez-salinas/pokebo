// Consume la cola de feedback del worker de push: retira de Mongo los tokens que FCM rechazó
// (UNREGISTERED / INVALID_ARGUMENT). La Lambda no tiene acceso a MongoDB, por eso pasa por SQS.
const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const config = require('../config');
const User = require('../models/User.model');

const FEEDBACK_TYPE = 'pokebo.push-token-invalid';
const MAX_TOKENS = 50;
const RETRY_DELAY_MS = 5000;

const sqsClient = new SQSClient(config.awsRegion ? { region: config.awsRegion } : {});

function parseFeedback(body) {
  let message;
  try { message = JSON.parse(body); } catch { return null; }
  if (message?.schemaVersion !== 1 || message.type !== FEEDBACK_TYPE) return null;
  if (typeof message.userId !== 'string' || !message.userId) return null;
  if (!Array.isArray(message.tokens)) return null;
  const tokens = message.tokens.filter((token) => typeof token === 'string' && token).slice(0, MAX_TOKENS);
  return tokens.length > 0 ? { userId: message.userId, tokens } : null;
}

// Devuelve cuántos tokens se retiraron. Un mensaje malformado se descarta (no tiene arreglo posible).
async function processMessage(message) {
  const feedback = parseFeedback(message.Body);
  if (!feedback) return 0;
  const result = await User.updateOne(
    { _id: feedback.userId },
    { $pull: { pushTokens: { token: { $in: feedback.tokens } } } },
  );
  return result.modifiedCount ? feedback.tokens.length : 0;
}

// Una ronda de long polling; devuelve cuántos mensajes procesó
async function pollOnce({ client = sqsClient, queueUrl = config.pushFeedbackQueueUrl, signal } = {}) {
  const { Messages = [] } = await client.send(
    new ReceiveMessageCommand({ QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20 }),
    { abortSignal: signal },
  );
  for (const message of Messages) {
    await processMessage(message); // si falla, el mensaje reaparece tras el visibility timeout
    await client.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle }));
  }
  return Messages.length;
}

// Bucle en segundo plano; un error se registra (sin datos) y se reintenta. Devuelve una función para detenerlo.
function start(options = {}) {
  const queueUrl = options.queueUrl || config.pushFeedbackQueueUrl;
  if (!queueUrl) return () => {};

  const controller = new AbortController();
  (async () => {
    while (!controller.signal.aborted) {
      try {
        await pollOnce({ ...options, queueUrl, signal: controller.signal });
      } catch (cause) {
        if (controller.signal.aborted) return;
        console.warn('[push-feedback] error al leer la cola:', cause?.name || 'Error');
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  })();
  return () => controller.abort();
}

module.exports = { start, pollOnce, processMessage, parseFeedback, FEEDBACK_TYPE };

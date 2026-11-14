const crypto = require('crypto');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const config = require('../config');

const MESSAGE_TYPE = 'pokebo.otp-email.requested';
const SCHEMA_VERSION = 1;
const PURPOSES = new Set(['registration', 'login', 'password-reset']);

const sqsClient = new SQSClient(config.awsRegion ? { region: config.awsRegion } : {});

function assertDelivery(delivery) {
  if (!delivery || !PURPOSES.has(delivery.purpose)) {
    throw new TypeError('El purpose del correo OTP no es válido');
  }
  if (typeof delivery.email !== 'string' || !delivery.email.includes('@')) {
    throw new TypeError('El destinatario del correo OTP no es válido');
  }
  if (typeof delivery.code !== 'string' || !/^[A-Z0-9]{6}$/.test(delivery.code)) {
    throw new TypeError('El código OTP no es válido');
  }
  if (!Number.isInteger(delivery.expiresIn) || delivery.expiresIn <= 0) {
    throw new TypeError('La expiración del correo OTP no es válida');
  }
}

function buildMessage(delivery, options = {}) {
  assertDelivery(delivery);
  return {
    schemaVersion: SCHEMA_VERSION,
    type: MESSAGE_TYPE,
    deliveryId: options.deliveryId || crypto.randomUUID(),
    createdAt: (options.now || new Date()).toISOString(),
    purpose: delivery.purpose,
    to: delivery.email.trim().toLowerCase(),
    code: delivery.code,
    expiresInSeconds: delivery.expiresIn,
  };
}

async function enqueue(delivery, options = {}) {
  const queueUrl = options.queueUrl || config.otpEmailQueueUrl;
  if (!queueUrl) throw new Error('Falta OTP_EMAIL_QUEUE_URL en la configuración del Core API');

  const message = buildMessage(delivery, options);
  const client = options.client || sqsClient;
  await client.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify(message),
  }));
  return { deliveryId: message.deliveryId };
}

module.exports = { enqueue, buildMessage, MESSAGE_TYPE, SCHEMA_VERSION };

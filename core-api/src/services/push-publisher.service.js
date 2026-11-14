// Publica pedidos de push en SQS. El envío real (FCM) lo hace la Lambda workers/push-sender.
// La Lambda no tiene acceso a MongoDB, por eso el mensaje lleva los tokens del destinatario.
const crypto = require('crypto');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const config = require('../config');

const MESSAGE_TYPE = 'pokebo.push.requested';
const SCHEMA_VERSION = 1;
const CATEGORIES = new Set(['nearby']);
// Solo Android en esta etapa: los tokens iOS (APNs) se guardan pero no se envían.
const SUPPORTED_PLATFORMS = new Set(['android']);
const DEFAULT_TTL_SECONDS = 60 * 60; // un aviso de cercanía de más de una hora ya no sirve
const MAX_TOKENS_PER_MESSAGE = 10;

const sqsClient = new SQSClient(config.awsRegion ? { region: config.awsRegion } : {});

// Tokens que este worker puede atender, sin repetidos
function deliverableTokens(pushTokens) {
  const seen = new Set();
  const tokens = [];
  for (const item of pushTokens || []) {
    if (!item || !SUPPORTED_PLATFORMS.has(item.platform)) continue;
    if (typeof item.token !== 'string' || !item.token.trim() || seen.has(item.token)) continue;
    seen.add(item.token);
    tokens.push({ token: item.token, platform: item.platform });
  }
  return tokens.slice(-MAX_TOKENS_PER_MESSAGE); // los más recientes
}

// FCM exige que los valores de data sean strings
function stringifyData(data) {
  const result = {};
  for (const [key, value] of Object.entries(data || {})) {
    if (value === undefined || value === null) continue;
    result[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return result;
}

function buildMessage(request, options = {}) {
  const { userId, category, title, body, data, tokens } = request || {};
  if (!userId) throw new TypeError('Falta el usuario destinatario del push');
  if (!CATEGORIES.has(category)) throw new TypeError('La categoría del push no es válida');
  if (typeof title !== 'string' || !title.trim()) throw new TypeError('El título del push no es válido');
  if (typeof body !== 'string') throw new TypeError('El cuerpo del push no es válido');
  if (!Array.isArray(tokens) || tokens.length === 0) throw new TypeError('El push no tiene tokens');

  return {
    schemaVersion: SCHEMA_VERSION,
    type: MESSAGE_TYPE,
    deliveryId: options.deliveryId || crypto.randomUUID(),
    createdAt: (options.now || new Date()).toISOString(),
    ttlSeconds: options.ttlSeconds || DEFAULT_TTL_SECONDS,
    category,
    userId: String(userId),
    tokens,
    notification: { title: title.slice(0, 120), body: body.slice(0, 240) },
    data: stringifyData(data),
  };
}

async function enqueue(request, options = {}) {
  const queueUrl = options.queueUrl || config.pushQueueUrl;
  if (!queueUrl) throw new Error('Falta PUSH_QUEUE_URL en la configuración del Core API');

  const message = buildMessage(request, options);
  const client = options.client || sqsClient;
  await client.send(new SendMessageCommand({ QueueUrl: queueUrl, MessageBody: JSON.stringify(message) }));
  return { deliveryId: message.deliveryId };
}

// Sin cola configurada (desarrollo local con docker compose) no se publica push: se sigue solo con buzón y polling.
function isEnabled() {
  return Boolean(config.pushQueueUrl);
}

module.exports = { enqueue, buildMessage, deliverableTokens, isEnabled, MESSAGE_TYPE, SCHEMA_VERSION };

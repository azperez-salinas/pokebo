const { DynamoDBClient, PutItemCommand, UpdateItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const { createFcmClient } = require('./fcm');

const MESSAGE_TYPE = 'pokebo.push.requested';
const FEEDBACK_TYPE = 'pokebo.push-token-invalid';
const CATEGORIES = new Set(['nearby']);
const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseMessage(record) {
  let m;
  try { m = JSON.parse(record.body); } catch { throw new TypeError('El mensaje SQS no contiene JSON válido'); }
  if (m?.schemaVersion !== 1 || m.type !== MESSAGE_TYPE) throw new TypeError('Contrato de push no soportado');
  if (typeof m.deliveryId !== 'string' || m.deliveryId.length < 16) throw new TypeError('deliveryId inválido');
  if (!CATEGORIES.has(m.category)) throw new TypeError('category inválida');
  if (typeof m.userId !== 'string' || !m.userId) throw new TypeError('userId inválido');
  if (!Array.isArray(m.tokens) || m.tokens.length === 0) throw new TypeError('tokens inválidos');
  if (!m.notification || typeof m.notification.title !== 'string' || typeof m.notification.body !== 'string') {
    throw new TypeError('notification inválida');
  }
  if (!Number.isInteger(m.ttlSeconds) || m.ttlSeconds <= 0) throw new TypeError('ttlSeconds inválido');
  if (Number.isNaN(Date.parse(m.createdAt))) throw new TypeError('createdAt inválido');
  return m;
}

function createHandler(options = {}) {
  const dynamo = options.dynamoClient || new DynamoDBClient({});
  const sqs = options.sqsClient || new SQSClient({});
  const secrets = options.secretsClient || new SecretsManagerClient({});
  const now = options.now || (() => Date.now());
  const tableName = options.tableName || process.env.IDEMPOTENCY_TABLE_NAME;
  const feedbackQueueUrl = options.feedbackQueueUrl || process.env.PUSH_FEEDBACK_QUEUE_URL;
  const fcmSecretId = options.fcmSecretId || process.env.FCM_SECRET_ID;

  if (!tableName) throw new Error('Falta IDEMPOTENCY_TABLE_NAME');
  if (!feedbackQueueUrl) throw new Error('Falta PUSH_FEEDBACK_QUEUE_URL');
  if (!options.fcmClient && !fcmSecretId) throw new Error('Falta FCM_SECRET_ID');

  let fcm = options.fcmClient;
  async function getFcm() {
    if (fcm) return fcm;
    const { SecretString } = await secrets.send(new GetSecretValueCommand({ SecretId: fcmSecretId }));
    fcm = createFcmClient({ account: JSON.parse(SecretString), fetchImpl: options.fetchImpl, now });
    return fcm;
  }

  async function reportInvalidTokens(message, tokens) {
    await sqs.send(new SendMessageCommand({
      QueueUrl: feedbackQueueUrl,
      MessageBody: JSON.stringify({
        schemaVersion: 1, type: FEEDBACK_TYPE, userId: message.userId, tokens, reportedAt: new Date(now()).toISOString(),
      }),
    }));
  }

  async function processRecord(record) {
    const message = parseMessage(record);
    if (Date.parse(message.createdAt) + message.ttlSeconds * 1000 <= now()) {
      console.info('Push descartado por expiración', { deliveryId: message.deliveryId });
      return;
    }

    const key = `push#${message.deliveryId}`;
    try {
      await dynamo.send(new PutItemCommand({
        TableName: tableName,
        Item: {
          pk: { S: key },
          status: { S: 'PROCESSING' },
          expiresAt: { N: String(Math.floor(now() / 1000) + IDEMPOTENCY_TTL_SECONDS) },
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }));
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') {
        console.info('Push ya procesado', { deliveryId: message.deliveryId });
        return;
      }
      throw error;
    }

    try {
      const client = await getFcm();
      const remaining = Math.max(1, Math.floor((Date.parse(message.createdAt) + message.ttlSeconds * 1000 - now()) / 1000));
      const invalid = [];
      let retryable = null;
      for (const { token, platform } of message.tokens) {
        if (platform !== 'android') continue; // APNs queda fuera de esta etapa
        try {
          const result = await client.send({ token, notification: message.notification, data: message.data || {}, ttlSeconds: remaining });
          if (result.invalidToken) invalid.push(token);
        } catch (error) {
          retryable = error;
        }
      }
      // Los tokens rechazados se informan siempre, incluso si otro token obliga a reintentar
      if (invalid.length > 0) await reportInvalidTokens(message, invalid);
      if (retryable) throw retryable;

      await dynamo.send(new UpdateItemCommand({
        TableName: tableName,
        Key: { pk: { S: key } },
        UpdateExpression: 'SET #status = :sent',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':sent': { S: 'SENT' } },
      }));
      console.info('Push procesado', { deliveryId: message.deliveryId, tokens: message.tokens.length, invalid: invalid.length });
    } catch (error) {
      try {
        await dynamo.send(new DeleteItemCommand({ TableName: tableName, Key: { pk: { S: key } } }));
      } catch (cleanupError) {
        console.error('No se pudo liberar la marca idempotente', { deliveryId: message.deliveryId, error: cleanupError?.name || 'Error' });
      }
      throw error;
    }
  }

  return async function handler(event) {
    const failures = [];
    for (const record of event.Records || []) {
      try {
        await processRecord(record);
      } catch (error) {
        console.error('Falló el procesamiento de un push', { messageId: record.messageId, error: error?.name || 'Error', status: error?.status });
        failures.push({ itemIdentifier: record.messageId });
      }
    }
    return { batchItemFailures: failures };
  };
}

let defaultHandler;
async function handler(event) {
  defaultHandler ||= createHandler();
  return defaultHandler(event);
}

module.exports = { handler, createHandler, parseMessage, MESSAGE_TYPE, FEEDBACK_TYPE };

const {
  DynamoDBClient,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
} = require('@aws-sdk/client-dynamodb');
const { SESv2Client, SendEmailCommand } = require('@aws-sdk/client-sesv2');
const { buildEmail } = require('./email');

const MESSAGE_TYPE = 'pokebo.otp-email.requested';
const PURPOSES = new Set(['registration', 'login', 'password-reset']);
const IDEMPOTENCY_TTL_SECONDS = 7 * 24 * 60 * 60;

function parseMessage(record) {
  let message;
  try {
    message = JSON.parse(record.body);
  } catch {
    throw new TypeError('El mensaje SQS no contiene JSON válido');
  }

  if (message?.schemaVersion !== 1 || message.type !== MESSAGE_TYPE) {
    throw new TypeError('Contrato de correo OTP no soportado');
  }
  if (typeof message.deliveryId !== 'string' || message.deliveryId.length < 16) {
    throw new TypeError('deliveryId inválido');
  }
  if (!PURPOSES.has(message.purpose)) throw new TypeError('purpose inválido');
  if (typeof message.to !== 'string' || !message.to.includes('@')) throw new TypeError('destinatario inválido');
  if (typeof message.code !== 'string' || !/^[A-Z0-9]{6}$/.test(message.code)) throw new TypeError('OTP inválido');
  if (!Number.isInteger(message.expiresInSeconds) || message.expiresInSeconds <= 0) {
    throw new TypeError('expiración inválida');
  }
  if (Number.isNaN(Date.parse(message.createdAt))) throw new TypeError('createdAt inválido');
  return message;
}

function createHandler(options = {}) {
  const dynamo = options.dynamoClient || new DynamoDBClient({});
  const ses = options.sesClient || new SESv2Client({});
  const now = options.now || (() => Date.now());
  const tableName = options.tableName || process.env.IDEMPOTENCY_TABLE_NAME;
  const fromAddress = options.fromAddress || process.env.SES_FROM_ADDRESS;

  if (!tableName) throw new Error('Falta IDEMPOTENCY_TABLE_NAME');
  if (!fromAddress) throw new Error('Falta SES_FROM_ADDRESS');

  async function processRecord(record) {
    const message = parseMessage(record);
    const createdAtMs = Date.parse(message.createdAt);
    if (createdAtMs + (message.expiresInSeconds * 1000) <= now()) {
      console.info('Correo OTP descartado por expiración', { deliveryId: message.deliveryId, purpose: message.purpose });
      return;
    }

    const key = `email#${message.deliveryId}`;
    const ttl = Math.floor(now() / 1000) + IDEMPOTENCY_TTL_SECONDS;
    try {
      await dynamo.send(new PutItemCommand({
        TableName: tableName,
        Item: {
          pk: { S: key },
          status: { S: 'PROCESSING' },
          purpose: { S: message.purpose },
          expiresAt: { N: String(ttl) },
        },
        ConditionExpression: 'attribute_not_exists(pk)',
      }));
    } catch (error) {
      if (error?.name === 'ConditionalCheckFailedException') {
        console.info('Correo OTP ya procesado', { deliveryId: message.deliveryId, purpose: message.purpose });
        return;
      }
      throw error;
    }

    try {
      const email = buildEmail(message);
      await ses.send(new SendEmailCommand({
        FromEmailAddress: fromAddress,
        Destination: { ToAddresses: [message.to] },
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: {
              Text: { Data: email.text, Charset: 'UTF-8' },
              Html: { Data: email.html, Charset: 'UTF-8' },
            },
          },
        },
      }));
      await dynamo.send(new UpdateItemCommand({
        TableName: tableName,
        Key: { pk: { S: key } },
        UpdateExpression: 'SET #status = :sent',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: { ':sent': { S: 'SENT' } },
      }));
      console.info('Correo OTP enviado', { deliveryId: message.deliveryId, purpose: message.purpose });
    } catch (error) {
      try {
        await dynamo.send(new DeleteItemCommand({ TableName: tableName, Key: { pk: { S: key } } }));
      } catch (cleanupError) {
        console.error('No se pudo liberar la marca idempotente', {
          deliveryId: message.deliveryId,
          error: cleanupError?.name || 'Error',
        });
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
        console.error('Falló el procesamiento de un correo OTP', {
          messageId: record.messageId,
          error: error?.name || 'Error',
        });
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

module.exports = { handler, createHandler, parseMessage, MESSAGE_TYPE };

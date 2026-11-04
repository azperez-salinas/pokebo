const crypto = require('crypto');
const bcrypt = require('bcrypt');
const config = require('../config');
const { redisClient } = require('../config/redis');
const User = require('../models/User.model');
const { issueTokens } = require('./token.service');
const { AppError } = require('../utils/errors');
const toPublicUser = require('../utils/toPublicUser');

const BCRYPT_ROUNDS = 10;
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const START_LIMIT = 5;
const START_WINDOW_SECONDS = 15 * 60;

const challengeKey = (challengeId) => `registration:challenge:${challengeId}`;
const lockKey = (challengeId) => `registration:lock:${challengeId}`;
const emailIndexKey = (emailHash) => `registration:email:${emailHash}`;
const startLimitKey = (emailHash) => `registration:start-limit:${emailHash}`;

const invalidCode = () => new AppError(401, 'INVALID_VERIFICATION_CODE', 'Código inválido o expirado');
const usernameTaken = () => new AppError(409, 'USERNAME_TAKEN', 'El nombre de usuario ya está en uso');

function requirePepper() {
  if (!config.registrationCodePepper) {
    throw new Error('Falta REGISTRATION_CODE_PEPPER en la configuracion del Core API');
  }
  return config.registrationCodePepper;
}

function hmac(value) {
  return crypto.createHmac('sha256', requirePepper()).update(value).digest('hex');
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function generateCode() {
  let code = '';
  for (let index = 0; index < 6; index += 1) {
    code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function codeHash(challengeId, code) {
  return hmac(`${challengeId}:${code}`);
}

function publicResponse(challengeId) {
  return {
    challengeId,
    message: 'Si los datos permiten continuar, recibirás un código por correo. El código es válido por 5 minutos.',
    expiresIn: config.registrationCodeTtl,
    resendAfter: config.registrationResendCooldown,
  };
}

async function enforceStartLimit(emailHash) {
  const key = startLimitKey(emailHash);
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, START_WINDOW_SECONDS);
  if (count > START_LIMIT) {
    throw new AppError(429, 'REGISTRATION_RATE_LIMITED', 'Demasiados intentos. Probá nuevamente más tarde.');
  }
}

async function storePending({ challengeId, email, username, avatar, passwordHash, code, decoy }) {
  const key = challengeKey(challengeId);
  const emailHash = hmac(email);
  const previousChallengeId = await redisClient.get(emailIndexKey(emailHash));
  const transaction = redisClient.multi();
  if (previousChallengeId) transaction.del(challengeKey(previousChallengeId));
  transaction.hSet(key, {
    kind: decoy ? 'decoy' : 'real',
    email: decoy ? '' : email,
    emailHash,
    username: decoy ? '' : username,
    avatar: decoy ? '' : (avatar || ''),
    passwordHash: decoy ? '' : passwordHash,
    codeHash: codeHash(challengeId, code),
    attempts: '0',
    resendCount: '0',
    lastSentAt: String(Date.now()),
  });
  transaction.expire(key, config.registrationCodeTtl);
  transaction.set(emailIndexKey(emailHash), challengeId, {
    expiration: { type: 'EX', value: config.registrationCodeTtl },
  });
  await transaction.exec();
}

async function start(data) {
  const email = normalizeEmail(data.email);
  const emailHash = hmac(email);
  await enforceStartLimit(emailHash);

  if (await User.exists({ username: data.username })) throw usernameTaken();

  // Se calcula siempre para que un correo existente no tenga una ruta sensiblemente mas rapida.
  const [emailExists, passwordHash] = await Promise.all([
    User.exists({ email }),
    bcrypt.hash(data.password, BCRYPT_ROUNDS),
  ]);
  const challengeId = crypto.randomUUID();
  const code = generateCode();
  const decoy = Boolean(emailExists);

  await storePending({
    challengeId,
    email,
    username: data.username,
    avatar: data.avatar,
    passwordHash,
    code,
    decoy,
  });

  return {
    public: publicResponse(challengeId),
    delivery: decoy ? null : { email, code, challengeId, expiresIn: config.registrationCodeTtl },
  };
}

function hashesMatch(receivedHex, expectedHex) {
  const received = Buffer.from(receivedHex, 'hex');
  const expected = Buffer.from(expectedHex, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

async function releaseLock(key, token) {
  await redisClient.eval(
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    { keys: [key], arguments: [token] },
  );
}

async function cleanPending(challengeId, pending) {
  const transaction = redisClient.multi().del(challengeKey(challengeId));
  if (pending.emailHash) transaction.del(emailIndexKey(pending.emailHash));
  await transaction.exec();
}

async function verify(challengeId, code) {
  const key = challengeKey(challengeId);
  const lock = lockKey(challengeId);
  const lockToken = crypto.randomUUID();
  const acquired = await redisClient.set(lock, lockToken, {
    expiration: { type: 'EX', value: 15 },
    condition: 'NX',
  });
  if (!acquired) throw invalidCode();

  try {
    const pending = await redisClient.hGetAll(key);
    if (!pending || !pending.codeHash) throw invalidCode();

    const matches = hashesMatch(codeHash(challengeId, code.toUpperCase()), pending.codeHash);
    // Los desafios señuelo recorren la misma ruta de intentos que un codigo incorrecto.
    if (pending.kind !== 'real' || !matches) {
      const attempts = await redisClient.hIncrBy(key, 'attempts', 1);
      if (attempts >= config.registrationMaxAttempts) await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    if (await User.exists({ email: pending.email })) {
      await cleanPending(challengeId, pending);
      throw invalidCode();
    }
    if (await User.exists({ username: pending.username })) {
      await cleanPending(challengeId, pending);
      throw usernameTaken();
    }

    let user;
    try {
      user = await User.create({
        username: pending.username,
        email: pending.email,
        passwordHash: pending.passwordHash,
        ...(pending.avatar ? { avatar: pending.avatar } : {}),
        emailVerifiedAt: new Date(),
      });
    } catch (error) {
      if (error.code === 11000) {
        await cleanPending(challengeId, pending);
        const field = Object.keys(error.keyPattern || error.keyValue || {})[0];
        if (field === 'username') throw usernameTaken();
        throw invalidCode();
      }
      throw error;
    }

    await cleanPending(challengeId, pending);
    const tokens = await issueTokens(user);
    return { user: toPublicUser(user), ...tokens };
  } finally {
    await releaseLock(lock, lockToken);
  }
}

async function resend(challengeId) {
  const key = challengeKey(challengeId);
  const lock = lockKey(challengeId);
  const lockToken = crypto.randomUUID();
  const acquired = await redisClient.set(lock, lockToken, {
    expiration: { type: 'EX', value: 15 },
    condition: 'NX',
  });
  if (!acquired) throw new AppError(429, 'REGISTRATION_BUSY', 'La solicitud ya se está procesando.');

  try {
    const pending = await redisClient.hGetAll(key);
    if (!pending || !pending.codeHash) throw invalidCode();

    const elapsedSeconds = Math.floor((Date.now() - Number(pending.lastSentAt)) / 1000);
    if (elapsedSeconds < config.registrationResendCooldown) {
      throw new AppError(429, 'RESEND_TOO_SOON', 'Esperá antes de solicitar otro código.');
    }
    if (Number(pending.resendCount) >= config.registrationMaxResends) {
      throw new AppError(429, 'RESEND_LIMIT_REACHED', 'Alcanzaste el límite de reenvíos. Iniciá el registro nuevamente.');
    }

    const code = generateCode();
    await redisClient.multi()
      .hSet(key, {
        codeHash: codeHash(challengeId, code),
        attempts: '0',
        lastSentAt: String(Date.now()),
      })
      .hIncrBy(key, 'resendCount', 1)
      .expire(key, config.registrationCodeTtl)
      .expire(emailIndexKey(pending.emailHash), config.registrationCodeTtl)
      .exec();

    return {
      public: publicResponse(challengeId),
      delivery: pending.kind === 'real'
        ? { email: pending.email, code, challengeId, expiresIn: config.registrationCodeTtl }
        : null,
    };
  } finally {
    await releaseLock(lock, lockToken);
  }
}

module.exports = { start, verify, resend };

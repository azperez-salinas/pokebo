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
const DUMMY_HASH = bcrypt.hashSync('pokebo-dummy-password', BCRYPT_ROUNDS);

const challengeKey = (challengeId) => `login:challenge:${challengeId}`;
const lockKey = (challengeId) => `login:lock:${challengeId}`;
const userIndexKey = (userId) => `login:user:${userId}`;
const startLimitKey = (userId) => `login:start-limit:${userId}`;

const invalidCode = () => new AppError(401, 'INVALID_LOGIN_CODE', 'Código inválido o expirado');
const invalidCredentials = () => new AppError(401, 'INVALID_CREDENTIALS', 'Usuario o contraseña incorrectos');

function requirePepper() {
  if (!config.loginCodePepper) throw new Error('Falta LOGIN_CODE_PEPPER en la configuración del Core API');
  return config.loginCodePepper;
}

function hmac(value) {
  return crypto.createHmac('sha256', requirePepper()).update(value).digest('hex');
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
    message: 'Ingresá el código que enviamos al correo asociado. Es válido por 5 minutos.',
    expiresIn: config.loginCodeTtl,
    resendAfter: config.loginResendCooldown,
  };
}

async function enforceStartLimit(userId) {
  const key = startLimitKey(userId);
  const count = await redisClient.incr(key);
  if (count === 1) await redisClient.expire(key, START_WINDOW_SECONDS);
  if (count > START_LIMIT) {
    throw new AppError(429, 'LOGIN_RATE_LIMITED', 'Demasiados intentos. Probá nuevamente más tarde.');
  }
}

async function storePending({ challengeId, userId, code }) {
  const key = challengeKey(challengeId);
  const indexKey = userIndexKey(userId);
  const previousChallengeId = await redisClient.get(indexKey);
  const transaction = redisClient.multi();
  if (previousChallengeId) transaction.del(challengeKey(previousChallengeId));
  transaction.hSet(key, {
    userId: String(userId),
    codeHash: codeHash(challengeId, code),
    attempts: '0',
    resendCount: '0',
    lastSentAt: String(Date.now()),
  });
  transaction.expire(key, config.loginCodeTtl);
  transaction.set(indexKey, challengeId, {
    expiration: { type: 'EX', value: config.loginCodeTtl },
  });
  await transaction.exec();
}

async function start(credentials) {
  const user = await User.findOne({ username: credentials.username });
  const valid = await bcrypt.compare(credentials.password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !valid) throw invalidCredentials();

  const userId = String(user._id);
  await enforceStartLimit(userId);
  const challengeId = crypto.randomUUID();
  const code = generateCode();
  await storePending({ challengeId, userId, code });

  return {
    public: publicResponse(challengeId),
    delivery: {
      purpose: 'login', email: user.email, code, challengeId, expiresIn: config.loginCodeTtl,
    },
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
  await redisClient.del(challengeKey(challengeId));
  if (pending.userId) {
    await redisClient.eval(
      "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      { keys: [userIndexKey(pending.userId)], arguments: [challengeId] },
    );
  }
}

async function verify(challengeId, code) {
  const key = challengeKey(challengeId);
  const lock = lockKey(challengeId);
  const lockToken = crypto.randomUUID();
  const acquired = await redisClient.set(lock, lockToken, {
    expiration: { type: 'EX', value: 15 }, condition: 'NX',
  });
  if (!acquired) throw invalidCode();

  try {
    const pending = await redisClient.hGetAll(key);
    if (!pending || !pending.codeHash || !pending.userId) throw invalidCode();
    if (await redisClient.get(userIndexKey(pending.userId)) !== challengeId) {
      await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    const matches = hashesMatch(codeHash(challengeId, code.toUpperCase()), pending.codeHash);
    if (!matches) {
      const attempts = await redisClient.hIncrBy(key, 'attempts', 1);
      if (attempts >= config.loginMaxAttempts) await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    const user = await User.findById(pending.userId);
    if (!user) {
      await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    // Consumir antes de emitir tokens impide que dos verificaciones creen sesiones con el mismo código.
    await cleanPending(challengeId, pending);
    user.lastLoginAt = new Date();
    await user.save();
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
    expiration: { type: 'EX', value: 15 }, condition: 'NX',
  });
  if (!acquired) throw new AppError(429, 'LOGIN_BUSY', 'La solicitud ya se está procesando.');

  try {
    const pending = await redisClient.hGetAll(key);
    if (!pending || !pending.codeHash || !pending.userId) throw invalidCode();
    if (await redisClient.get(userIndexKey(pending.userId)) !== challengeId) {
      await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    const elapsedSeconds = Math.floor((Date.now() - Number(pending.lastSentAt)) / 1000);
    if (elapsedSeconds < config.loginResendCooldown) {
      throw new AppError(429, 'LOGIN_RESEND_TOO_SOON', 'Esperá antes de solicitar otro código.');
    }
    if (Number(pending.resendCount) >= config.loginMaxResends) {
      throw new AppError(429, 'LOGIN_RESEND_LIMIT_REACHED', 'Alcanzaste el límite de reenvíos. Iniciá sesión nuevamente.');
    }

    const user = await User.findById(pending.userId);
    if (!user) {
      await cleanPending(challengeId, pending);
      throw invalidCode();
    }

    const code = generateCode();
    await redisClient.multi()
      .hSet(key, { codeHash: codeHash(challengeId, code), attempts: '0', lastSentAt: String(Date.now()) })
      .hIncrBy(key, 'resendCount', 1)
      .expire(key, config.loginCodeTtl)
      .expire(userIndexKey(pending.userId), config.loginCodeTtl)
      .exec();

    return {
      public: publicResponse(challengeId),
      delivery: {
        purpose: 'login', email: user.email, code, challengeId, expiresIn: config.loginCodeTtl,
      },
    };
  } finally {
    await releaseLock(lock, lockToken);
  }
}

module.exports = { start, verify, resend };

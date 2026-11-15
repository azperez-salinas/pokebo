const buckets = new Map();

function createRateLimit({ name, limit, windowMs }) {
  return function rateLimitForWindow(req, res, next) {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const bucketKey = `${name}:${key}`;
    const current = buckets.get(bucketKey);
    if (!current || current.resetAt <= now) {
      buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > limit) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({ code: 'RATE_LIMITED', message: 'Demasiadas solicitudes. Proba nuevamente mas tarde.' });
    }
    return next();
  };
}

const rateLimit = createRateLimit({ name: 'global', limit: 120, windowMs: 60 * 1000 });
rateLimit.registration = createRateLimit({ name: 'registration', limit: 15, windowMs: 15 * 60 * 1000 });
rateLimit.login = createRateLimit({ name: 'login', limit: 20, windowMs: 15 * 60 * 1000 });

module.exports = rateLimit;

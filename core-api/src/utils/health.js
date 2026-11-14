// Estado de salud del Core: sano solo si MongoDB (readyState 1 = conectado) y Redis están listos.
function healthStatus({ mongoReadyState, redisReady }) {
  const mongo = mongoReadyState === 1;
  const redis = redisReady === true;
  const ok = mongo && redis;
  return { httpStatus: ok ? 200 : 503, body: { status: ok ? 'ok' : 'degraded', mongo, redis } };
}

module.exports = { healthStatus };

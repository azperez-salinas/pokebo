// Cliente mínimo de FCM HTTP v1 (sin dependencias de Google): firma el JWT de la cuenta de servicio con crypto.
const crypto = require('crypto');

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const ANDROID_CHANNEL_ID = 'nearby-sightings'; // mismo canal que crea la app

const b64url = (input) => Buffer.from(input).toString('base64url');

function signAssertion(account, nowSeconds) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: account.token_uri || 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  }));
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), account.private_key);
  return `${header}.${claims}.${signature.toString('base64url')}`;
}

function createFcmClient({ account, fetchImpl = fetch, now = () => Date.now() }) {
  let cached = null;

  async function accessToken() {
    if (cached && cached.expiresAt > now() + 60_000) return cached.value;
    const response = await fetchImpl(account.token_uri || 'https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: signAssertion(account, Math.floor(now() / 1000)),
      }),
    });
    if (!response.ok) throw Object.assign(new Error('OAuth de FCM rechazado'), { name: 'FcmAuthError', status: response.status });
    const json = await response.json();
    cached = { value: json.access_token, expiresAt: now() + (json.expires_in || 3600) * 1000 };
    return cached.value;
  }

  // Devuelve { ok: true } | { ok: false, invalidToken: true } | lanza (error recuperable)
  async function send({ token, notification, data, ttlSeconds }) {
    const response = await fetchImpl(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: 'POST',
      headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        message: {
          token,
          notification,
          data,
          android: { priority: 'HIGH', ttl: `${ttlSeconds}s`, notification: { channel_id: ANDROID_CHANNEL_ID } },
        },
      }),
    });
    if (response.ok) return { ok: true };

    const body = await response.json().catch(() => ({}));
    const code = body?.error?.details?.find((d) => d.errorCode)?.errorCode || body?.error?.status;
    if (code === 'UNREGISTERED' || code === 'INVALID_ARGUMENT' || response.status === 404) {
      return { ok: false, invalidToken: true, code };
    }
    if (response.status === 401) cached = null; // el próximo intento pide otro access token
    throw Object.assign(new Error('FCM no pudo entregar el mensaje'), { name: 'FcmError', status: response.status, code });
  }

  return { send };
}

module.exports = { createFcmClient, signAssertion, ANDROID_CHANNEL_ID };

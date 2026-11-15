// Refresh entre contextos: la pantalla y la tarea en segundo plano comparten SecureStore pero no memoria.
// Si el otro contexto ya rotó el refresh token, se adopta el nuevo en vez de cerrar la sesión.
import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

register('../test-support/extensionless-hooks.mjs', import.meta.url);

const store = new Map();
const calls = { request: [], refresh: [] };
let refreshImpl;
let requestImpl;

mock.module('expo-secure-store', {
  namedExports: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
    getItemAsync: async (key) => store.get(key) ?? null,
    setItemAsync: async (key, value) => { store.set(key, value); },
    deleteItemAsync: async (key) => { store.delete(key); },
  },
});
const servicePath = (name) => pathToFileURL(path.resolve(import.meta.dirname, '../src/services', name)).href;
mock.module(servicePath('api.js'), { namedExports: { request: async (...args) => { calls.request.push(args); return requestImpl(...args); } } });
mock.module(servicePath('auth.service.js'), { namedExports: { refresh: async (...args) => { calls.refresh.push(args); return refreshImpl(...args); } } });

const session = await import('../src/services/session.js');

const unauthorized = () => Object.assign(new Error('401'), { status: 401 });
function seedStore({ accessToken, refreshToken }) {
  store.set('pokebo.accessToken', accessToken);
  store.set('pokebo.refreshToken', refreshToken);
  store.set('pokebo.user', JSON.stringify({ id: 'u1' }));
}
function reset() {
  store.clear();
  calls.request.length = 0;
  calls.refresh.length = 0;
}

test('si otro contexto ya rotó el refresh token, se adopta y se reintenta el pedido', async () => {
  reset();
  seedStore({ accessToken: 'a1', refreshToken: 'r1' });
  await session.loadSession();

  // Mientras esta instancia intenta renovar con r1, el otro contexto ya guardó la sesión rotada.
  refreshImpl = async () => {
    seedStore({ accessToken: 'a2', refreshToken: 'r2' });
    throw unauthorized();
  };
  requestImpl = async (_path, options) => {
    if (options.token === 'a1') throw unauthorized();
    return { ok: true, token: options.token };
  };

  const result = await session.authRequest('/algo');
  assert.deepEqual(result, { ok: true, token: 'a2' });
  assert.equal(session.getSession().refreshToken, 'r2');
  assert.equal(store.get('pokebo.refreshToken'), 'r2');
});

test('si el refresh token no cambió en el almacenamiento, la sesión termina', async () => {
  reset();
  seedStore({ accessToken: 'a1', refreshToken: 'r1' });
  await session.loadSession();

  refreshImpl = async () => { throw unauthorized(); };
  requestImpl = async () => { throw unauthorized(); };

  await assert.rejects(session.authRequest('/algo'), { code: 'SESSION_ENDED' });
  assert.equal(session.getSession(), null);
  assert.equal(store.has('pokebo.refreshToken'), false);
});

test('un error de red al renovar no cierra la sesión', async () => {
  reset();
  seedStore({ accessToken: 'a1', refreshToken: 'r1' });
  await session.loadSession();

  refreshImpl = async () => { throw Object.assign(new Error('network'), { status: undefined }); };
  requestImpl = async () => { throw unauthorized(); };

  await assert.rejects(session.authRequest('/algo'), /network/);
  assert.equal(session.getSession().refreshToken, 'r1');
});

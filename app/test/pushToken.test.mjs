import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

register('../test-support/extensionless-hooks.mjs', import.meta.url);

const servicePath = (name) =>
  pathToFileURL(
    path.resolve(import.meta.dirname, '../src/services', name)
  ).href;

const taskPath = pathToFileURL(
  path.resolve(import.meta.dirname, '../src/tasks/locationTask.js')
).href;

let session = null;
let permissionGranted = true;
let deviceToken = 'token-test-1';
let networkError = false;
let requests = [];
let tokenReads = 0;

mock.module('react-native', {
  namedExports: {
    Platform: { OS: 'android' },
  },
});

mock.module('expo-constants', {
  defaultExport: {
    executionEnvironment: 'bare',
    appOwnership: 'standalone',
  },
});

mock.module('expo-notifications', {
  namedExports: {
    AndroidImportance: { DEFAULT: 3 },

    getPermissionsAsync: async () => ({
      granted: permissionGranted,
    }),

    getDevicePushTokenAsync: async () => {
      tokenReads++;
      return { type: 'fcm', data: deviceToken };
    },

    setNotificationChannelAsync: async () => {},
  },
});

mock.module(taskPath, {
  namedExports: {
    NEARBY_CHANNEL_ID: 'nearby-sightings',
  },
});

mock.module(servicePath('session.js'), {
  namedExports: {
    getSession: () => session,

    authRequest: async (url, options) => {
      requests.push({ url, options });

      if (networkError) {
        throw new Error('NETWORK_ERROR');
      }

      return { message: 'Push token registrado' };
    },
  },
});

const { registerDevicePushToken } = await import(
  '../src/services/pushToken.service.js'
);

function reset() {
  session = { user: { _id: 'test-user' } };
  permissionGranted = true;
  networkError = false;
  requests = [];
  tokenReads = 0;
}

test('registra un token válido', async () => {
  reset();

  const result = await registerDevicePushToken('test-user');

  assert.equal(result.status, 'registered');
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/users/me/push-token');

  assert.deepEqual(requests[0].options.body, {
    token: 'token-test-1',
    platform: 'android',
  });

  // El segundo intento no debe volver a registrar el token.
  const duplicate = await registerDevicePushToken('test-user');

  assert.equal(duplicate.status, 'already-registered');
  assert.equal(requests.length, 1);
});

test('permiso denegado: no registra el dispositivo', async () => {
  reset();
  permissionGranted = false;

  const result = await registerDevicePushToken('test-user');

  assert.equal(result.status, 'permission-denied');
  assert.equal(requests.length, 0);
  assert.equal(tokenReads, 0);
});

test('sin sesión: no registra el dispositivo', async () => {
  reset();
  session = null;

  const result = await registerDevicePushToken('test-user');

  assert.equal(result.status, 'no-session');
  assert.equal(requests.length, 0);
  assert.equal(tokenReads, 0);
});

test('error de red: permite reintentar el registro', async () => {
  reset();

  // Utilizamos un token diferente al de la primera prueba.
  deviceToken = 'token-test-network';
  networkError = true;

  await assert.rejects(
    registerDevicePushToken('test-user'),
    /NETWORK_ERROR/
  );

  networkError = false;

  const result = await registerDevicePushToken('test-user');

  assert.equal(result.status, 'registered');
  assert.equal(requests.length, 2);
});
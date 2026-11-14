const test = require('node:test');
const assert = require('node:assert/strict');
const { validateResponse, queryProvider } = require('../src/services/ai.service');

test('validateResponse acepta únicamente el contrato esperado y normaliza nombres', () => {
  assert.deepEqual(validateResponse({
    isAnimal: true,
    animalProbability: 0.91,
    screenProbability: 0.02,
    scientificName: '  Hydrochoerus hydrochaeris ',
    commonName: ' Carpincho ',
    ignored: 'no se propaga',
  }), {
    isAnimal: true,
    animalProbability: 0.91,
    screenProbability: 0.02,
    scientificName: 'Hydrochoerus hydrochaeris',
    commonName: 'Carpincho',
  });

  assert.throws(() => validateResponse({ isAnimal: true }), TypeError);
});

test('queryProvider envía la imagen con credenciales inyectadas sin incluirlas en el resultado', async () => {
  const requests = [];
  const response = await queryProvider(Buffer.from([0xff, 0xd8, 0xff]), undefined, {
    apiKey: 'test-api-key',
    model: 'test-model',
    fetch: async (url, options) => {
      requests.push({ url, options });
      return {
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({
          isAnimal: true,
          animalProbability: 0.9,
          screenProbability: 0.1,
          scientificName: 'Hydrochoerus hydrochaeris',
          commonName: 'Carpincho',
        }) }] } }] }),
      };
    },
  });

  assert.equal(requests[0].url.includes('test-model'), true);
  assert.equal(requests[0].options.headers['x-goog-api-key'], 'test-api-key');
  assert.equal(JSON.stringify(response).includes('test-api-key'), false);
});

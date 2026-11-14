const config = require('../config');
const { AppError } = require('../utils/errors');

const AI_TIMEOUT_MS = 12000;
const MAX_NAME_LENGTH = 120;
const SCREEN_PROBABILITY_LIMIT = 0.5;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const PROMPT = [
  'Analizá la imagen y respondé solo con el JSON pedido.',
  'isAnimal: true si hay un animal real en la foto (incluye al humano).',
  'animalProbability: de 0 a 1, qué tan seguro estás de la especie identificada.',
  'screenProbability: de 0 a 1, probabilidad de que la foto sea de una pantalla o imagen impresa.',
  'scientificName: nombre científico binomial. Si isAnimal es false, string vacío.',
  'commonName: nombre común de la especie en español. Si isAnimal es false, string vacío.',
].join('\n');

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    isAnimal: { type: 'boolean' },
    animalProbability: { type: 'number' },
    screenProbability: { type: 'number' },
    scientificName: { type: 'string' },
    commonName: { type: 'string' },
  },
  required: ['isAnimal', 'animalProbability', 'screenProbability', 'scientificName', 'commonName'],
};

const isProbability = (value) => typeof value === 'number'
  && Number.isFinite(value)
  && value >= 0
  && value <= 1;
const isText = (value) => typeof value === 'string' && value.length <= MAX_NAME_LENGTH;
const isName = (value) => isText(value) && value.trim().length > 0;

function validateResponse(response) {
  const valid = response
    && typeof response.isAnimal === 'boolean'
    && isProbability(response.animalProbability)
    && isProbability(response.screenProbability)
    && (response.isAnimal
      ? isName(response.scientificName) && isName(response.commonName)
      : isText(response.scientificName) && isText(response.commonName));
  if (!valid) throw new TypeError('Respuesta de IA con formato inválido');

  return {
    isAnimal: response.isAnimal,
    animalProbability: response.animalProbability,
    screenProbability: response.screenProbability,
    scientificName: response.scientificName.trim(),
    commonName: response.commonName.trim(),
  };
}

async function queryProvider(image, signal, options = {}) {
  const apiKey = options.apiKey || config.aiProviderApiKey;
  const model = options.model || config.aiModel;
  if (!apiKey || !model) throw new Error('Falta la configuración del proveedor de IA en Core');

  const response = await (options.fetch || fetch)(
    `${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: PROMPT },
          { inline_data: { mime_type: 'image/jpeg', data: image.toString('base64') } },
        ] }],
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: RESPONSE_SCHEMA },
      }),
    },
  );

  if (!response.ok) throw new Error(`El proveedor de IA respondió ${response.status}`);
  const text = (await response.json()).candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== 'string') throw new Error('El proveedor de IA no devolvió contenido');
  return JSON.parse(text);
}

async function identifySpecies(image, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs || AI_TIMEOUT_MS);
  let ai;
  try {
    ai = validateResponse(await queryProvider(image, controller.signal, options));
  } catch (error) {
    console.error('Falló la identificación de imagen', { error: error?.name || 'Error' });
    throw new AppError(
      503,
      'IDENTIFICATION_UNAVAILABLE',
      'No se pudo identificar la imagen, intentá de nuevo en unos minutos',
    );
  } finally {
    clearTimeout(timer);
  }

  if (!ai.isAnimal || ai.screenProbability >= SCREEN_PROBABILITY_LIMIT) {
    throw new AppError(422, 'NO_ANIMAL_DETECTED', 'No encontramos un animal en la imagen');
  }
  return ai;
}

module.exports = { identifySpecies, validateResponse, queryProvider };

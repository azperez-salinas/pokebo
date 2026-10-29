// Cliente del proveedor de IA de identificación de especies (Gemini con visión).
// La respuesta de la IA es entrada externa NO confiable: se valida antes de usarla.
const config = require('../config');
const { AppError } = require('../utils/errors');

const AI_TIMEOUT_MS = 12000; // Edge→IA 12 s (cliente 20 s > Nginx 15 s > IA 12 s > Core 10 s)
const MAX_NAME_LENGTH = 120;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// A partir de esta probabilidad la foto se considera de una pantalla y se rechaza como si no hubiera animal
const SCREEN_PROBABILITY_LIMIT = 0.5;

const PROMPT = [
  'Analizá la imagen y respondé solo con el JSON pedido.',
  'isAnimal: true si hay un animal real en la foto.',
  'animalProbability: de 0 a 1, qué tan seguro estás de la especie identificada.',
  'screenProbability: de 0 a 1, probabilidad de que la foto sea de una pantalla (celular, monitor, TV) o de una imagen impresa y no de un animal real.',
  'scientificName: nombre científico binomial de la especie (por ejemplo "Vanellus chilensis"). Si isAnimal es false, string vacío.',
  'commonName: nombre común de la especie en español. Si isAnimal es false, string vacío.',
].join('\n');

// Formato fijo de la respuesta (JSON Schema): no depende de cuántas especies tenga el catálogo
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

// Envía la imagen (Buffer JPEG) a Gemini y devuelve el JSON de su respuesta, sin validar.
async function consultarProveedor(imagen, signal) {
  const respuesta = await fetch(`${GEMINI_URL}/${encodeURIComponent(config.aiModel)}:generateContent`, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.aiProviderApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: 'image/jpeg', data: imagen.toString('base64') } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
      },
    }),
  });
  if (!respuesta.ok) {
    // El cuerpo de error de Gemini dice el motivo (por ejemplo RESOURCE_EXHAUSTED); no incluye la API key
    const detalle = (await respuesta.json().catch(() => null))?.error;
    throw new Error(`El proveedor respondió ${respuesta.status}${detalle ? ` (${detalle.status || detalle.code}: ${detalle.message})` : ''}`);
  }

  // Si Gemini bloquea la imagen o no responde, no hay candidates o el texto viene vacío
  const texto = (await respuesta.json()).candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof texto !== 'string') throw new Error('El proveedor no devolvió contenido');
  console.log('Respuesta de la IA:', texto); // solo el JSON de la identificación: sin imagen ni API key
  return JSON.parse(texto);
}

const esProbabilidad = (valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1;
const esTexto = (valor) => typeof valor === 'string' && valor.length <= MAX_NAME_LENGTH;
const esNombre = (valor) => esTexto(valor) && valor.trim().length > 0;

// Valida el formato fijo del contrato con la IA. Se devuelve un objeto nuevo solo con los campos esperados.
// Los nombres solo son obligatorios si hay un animal: sin animal la IA los devuelve vacíos.
function validarRespuesta(respuesta) {
  const valida = respuesta
    && typeof respuesta.isAnimal === 'boolean'
    && esProbabilidad(respuesta.animalProbability)
    && esProbabilidad(respuesta.screenProbability)
    && (respuesta.isAnimal
      ? esNombre(respuesta.scientificName) && esNombre(respuesta.commonName)
      : esTexto(respuesta.scientificName) && esTexto(respuesta.commonName));
  if (!valida) throw new Error('Respuesta de la IA con formato inválido');

  const { isAnimal, animalProbability, screenProbability, scientificName, commonName } = respuesta;
  return { isAnimal, animalProbability, screenProbability, scientificName: scientificName.trim(), commonName: commonName.trim() };
}

// Identifica la especie de la imagen (Buffer JPEG). Si la IA falla, tarda más de 12 s o responde algo
// inválido, se responde 503 IDENTIFICATION_UNAVAILABLE y no se reenvía nada al Core.
// Si no hay animal o la foto es de una pantalla, se responde 422 NO_ANIMAL_DETECTED sin reenviar nada al Core.
async function identificarEspecie(imagen) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let ai;
  try {
    ai = validarRespuesta(await consultarProveedor(imagen, controller.signal));
  } catch (err) {
    console.error('Fallo en la identificación:', err.message);
    throw new AppError(503, 'IDENTIFICATION_UNAVAILABLE', 'No se pudo identificar la imagen, intentá de nuevo en unos minutos');
  } finally {
    clearTimeout(timer);
  }

  if (!ai.isAnimal || ai.screenProbability >= SCREEN_PROBABILITY_LIMIT) {
    throw new AppError(422, 'NO_ANIMAL_DETECTED', 'No encontramos un animal en la imagen');
  }
  return ai;
}

module.exports = { identificarEspecie };

// Cliente del proveedor de IA de identificación de especies.
// La respuesta de la IA es entrada externa NO confiable: se valida antes de usarla.
const { AppError } = require('../utils/errors');

const AI_TIMEOUT_MS = 12000; // Edge→IA 12 s (cliente 20 s > Nginx 15 s > IA 12 s > Core 10 s)
const MAX_NAME_LENGTH = 120;

// MOCK PROVISIONAL: reemplazar por el proveedor real (usando config.aiProviderApiKey).
// Devuelve siempre la misma respuesta, con un nombre científico que no está en el catálogo,
// así el flujo llega al Core y termina en SPECIES_NOT_RECOGNIZED.
async function consultarProveedor(imagen) {
  return {
    isAnimal: true,
    animalProbability: 0.9,
    screenProbability: 0.05,
    scientificName: 'Mockus provisionalis',
    commonName: 'Especie de prueba',
  };
}

const esProbabilidad = (valor) => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1;
const esNombre = (valor) => typeof valor === 'string' && valor.trim().length > 0 && valor.length <= MAX_NAME_LENGTH;

// Valida el formato fijo del contrato con la IA. Se devuelve un objeto nuevo solo con los campos esperados.
function validarRespuesta(respuesta) {
  const valida = respuesta
    && typeof respuesta.isAnimal === 'boolean'
    && esProbabilidad(respuesta.animalProbability)
    && esProbabilidad(respuesta.screenProbability)
    && esNombre(respuesta.scientificName)
    && esNombre(respuesta.commonName);
  if (!valida) throw new Error('Respuesta de la IA con formato inválido');

  const { isAnimal, animalProbability, screenProbability, scientificName, commonName } = respuesta;
  return { isAnimal, animalProbability, screenProbability, scientificName: scientificName.trim(), commonName: commonName.trim() };
}

// Identifica la especie de la imagen (Buffer JPEG). Si la IA falla, tarda más de 12 s o responde algo
// inválido, se responde 503 IDENTIFICATION_UNAVAILABLE y no se reenvía nada al Core.
async function identificarEspecie(imagen) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('Timeout de la IA')), AI_TIMEOUT_MS);
  });
  try {
    const respuesta = await Promise.race([consultarProveedor(imagen), timeout]);
    return validarRespuesta(respuesta);
  } catch (err) {
    console.error('Fallo en la identificación:', err.message);
    throw new AppError(503, 'IDENTIFICATION_UNAVAILABLE', 'No se pudo identificar la imagen, intentá de nuevo en unos minutos');
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { identificarEspecie };

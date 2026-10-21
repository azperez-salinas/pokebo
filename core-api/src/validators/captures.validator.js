const Joi = require('joi');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// Largo máximo de 5 MB codificados en base64 (4 caracteres cada 3 bytes)
const MAX_IMAGE_BASE64_LENGTH = 4 * Math.ceil(MAX_IMAGE_BYTES / 3);
// Todo JPEG empieza con FF D8 FF, que en base64 queda como "/9j/": el tipo se verifica por contenido
const JPEG_BASE64_PREFIX = /^\/9j\//;

const probability = Joi.number().min(0).max(1).required();

// Body que arma el Edge después de consultar a la IA. La respuesta de la IA también es entrada no confiable.
const create = Joi.object({
  imageBase64: Joi.string()
    .max(MAX_IMAGE_BASE64_LENGTH)
    .base64({ paddingRequired: true })
    .pattern(JPEG_BASE64_PREFIX, 'JPEG')
    .required()
    // Mensaje propio: el de Joi repite el valor, que acá es la imagen entera en base64
    .messages({ 'string.pattern.name': '"imageBase64" tiene que ser una imagen JPEG' }),
  contentType: Joi.string().valid('image/jpeg').required(),
  lat: Joi.number().min(-90).max(90).required(),
  lng: Joi.number().min(-180).max(180).required(),
  ai: Joi.object({
    isAnimal: Joi.boolean().required(),
    animalProbability: probability,
    screenProbability: probability,
    scientificName: Joi.string().trim().max(120).required(),
    commonName: Joi.string().trim().max(120).required(),
  }).required(),
});

module.exports = { create };

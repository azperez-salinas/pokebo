// Acceso a imágenes de GridFS. Una imagen se sirve solo si es una foto de captura del usuario
// o una imagen de alguna especie del catálogo; cualquier otro id responde 404 (no revela qué ids existen).
const mongoose = require('mongoose');
const Capture = require('../models/Capture.model');
const Species = require('../models/Species.model');
const gridfsService = require('./gridfs.service');
const { AppError } = require('../utils/errors');

const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function getImage(userId, imageId) {
  const notFound = () => new AppError(404, 'NOT_FOUND', 'Imagen no encontrada');
  const id = new mongoose.Types.ObjectId(imageId);

  const [esFotoPropia, esDeEspecie] = await Promise.all([
    Capture.exists({ photoId: id, user: userId }),
    Species.exists({ imagesIds: id }),
  ]);
  if (!esFotoPropia && !esDeEspecie) throw notFound();

  const image = await gridfsService.openImage(id);
  if (!image) throw notFound();

  // Solo se sirven tipos de imagen conocidos, sin importar lo que diga el metadato guardado
  if (!ALLOWED_CONTENT_TYPES.includes(image.contentType)) {
    image.stream.destroy();
    throw notFound();
  }
  return image;
}

module.exports = { getImage };

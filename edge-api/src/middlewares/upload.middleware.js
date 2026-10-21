// Recibe la imagen de POST /captures (multipart/form-data, campo "image").
// Se guarda solo en memoria: el Edge no persiste nada. Límite de 5 MB y tipo verificado por CONTENIDO
// (firma de JPEG FF D8 FF), sin confiar en el mimetype ni en la extensión que manda el cliente.
const multer = require('multer');
const { AppError } = require('../utils/errors');

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 5, fieldSize: 100, parts: 6 },
}).single('image');

function isJpeg(buffer) {
  return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
}

function upload(req, res, next) {
  parser(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError(413, 'PAYLOAD_TOO_LARGE', 'La imagen supera los 5 MB'));
      }
      return next(new AppError(400, 'BAD_REQUEST', 'La solicitud multipart no es válida'));
    }
    if (err) return next(new AppError(400, 'BAD_REQUEST', 'La solicitud multipart no es válida'));

    if (!req.file) return next(new AppError(400, 'BAD_REQUEST', 'Falta la imagen (campo image)'));
    if (!isJpeg(req.file.buffer)) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'La imagen tiene que ser JPEG'));
    }
    return next();
  });
}

module.exports = upload;

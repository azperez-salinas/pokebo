const { Readable } = require('stream');
const { getGridFSBucket } = require('../config/gridfs');

// Guarda una imagen en GridFS y devuelve su ObjectId.
async function uploadImage({ buffer, filename, contentType }) {

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('La imagen debe ser un Buffer no vacío');
  }

  if (!filename || typeof filename !== 'string') {
    throw new Error('El nombre del archivo es obligatorio');
  }

  if (!contentType || !contentType.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }

  const bucket = getGridFSBucket();

  const uploadStream = bucket.openUploadStream(filename, {
    metadata: {
      contentType
    }
  });

  await new Promise((resolve, reject) => {

    const readableStream = Readable.from(buffer);

    readableStream
      .pipe(uploadStream)
      .on('finish', resolve)
      .on('error', reject);

    readableStream.on('error', reject);
  });

  return uploadStream.id;
}

// Borra una imagen de GridFS. Si ya no existe no es un error (el borrado es idempotente).
async function deleteImage(id) {
  try {
    await getGridFSBucket().delete(id);
  } catch (err) {
    if (err.code !== 'ENOENT' && !/FileNotFound/i.test(err.message)) throw err;
  }
}

module.exports = { uploadImage, deleteImage };

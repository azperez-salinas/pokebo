const imagesService = require('../services/images.service');

async function getById(req, res, next) {
  try {
    const { stream, contentType, length } = await imagesService.getImage(req.user.id, req.params.id);

    res.set({
      'Content-Type': contentType,
      'Content-Length': length,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=86400',
    });
    stream.on('error', (err) => {
      console.error('Error leyendo la imagen de GridFS:', err.message);
      res.destroy(err);
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
}

module.exports = { getById };

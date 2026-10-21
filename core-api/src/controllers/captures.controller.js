const { AppError } = require('../utils/errors');

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

// PROVISIONAL: todavía no hay catálogo de especies ni reconocimiento real, así que toda captura
// termina en SPECIES_NOT_RECOGNIZED sin escribir nada en Mongo ni en GridFS.
// TODO: buscar req.body.ai.scientificName (normalizado) en species y, si existe, guardar la foto
// con gridfs.service.uploadImage y la captura con captures.service.create (responde 201).
function create(req, res, next) {
  next(new AppError(422, 'SPECIES_NOT_RECOGNIZED', 'Hay un animal, pero no se pudo vincular con el catálogo de especies'));
}

module.exports = {
  create,
  listMine: notImplemented,
};

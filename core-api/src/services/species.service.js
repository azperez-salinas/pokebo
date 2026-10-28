// Catálogo de especies.
const Species = require('../models/Species.model');
const Capture = require('../models/Capture.model');
const { AppError } = require('../utils/errors');

async function list(filters) {
  // TODO
  throw new Error('not implemented');
}

// Ficha de la especie + progreso del usuario (cuántas capturas tiene de ella).
async function getById(speciesId, userId) {
  const species = await Species.findById(speciesId);
  if (!species) throw new AppError(404, 'NOT_FOUND', 'Especie no encontrada');

  const captures = await Capture.countDocuments({ user: userId, species: species._id });

  return {
    id: species._id,
    commonName: species.commonName,
    scientificName: species.scientificName,
    family: species.family,
    class: species.class,
    description: species.description,
    habitat: species.habitat,
    diet: species.diet,
    distribution: species.distribution,
    conservationStatus: species.conservationStatus,
    funFacts: species.funFacts,
    imagesIds: species.imagesIds,
    progress: { captures },
  };
}

module.exports = { list, getById };

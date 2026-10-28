// Registro y consulta de capturas.
const mongoose = require('mongoose');
const Capture = require('../models/Capture.model');
const Species = require('../models/Species.model');

async function create(userId, data) {
  // TODO
  throw new Error('not implemented');
}

// Rango de fechas (UTC) para año y/o mes. Mes solo = ese mes de cualquier año.
function filtroFecha({ year, month }) {
  if (year && month) {
    return { capturedAt: { $gte: new Date(Date.UTC(year, month - 1, 1)), $lt: new Date(Date.UTC(year, month, 1)) } };
  }
  if (year) {
    return { capturedAt: { $gte: new Date(Date.UTC(year, 0, 1)), $lt: new Date(Date.UTC(year + 1, 0, 1)) } };
  }
  if (month) {
    return { $expr: { $eq: [{ $month: '$capturedAt' }, month] } };
  }
  return {};
}

const toPublicCapture = (capture) => ({
  id: capture._id,
  photoUrl: `/api/v1/images/${capture.photoId}`,
  species: capture.species && {
    id: capture.species._id,
    commonName: capture.species.commonName,
    scientificName: capture.species.scientificName,
    family: capture.species.family,
    class: capture.species.class,
  },
  capturedAt: capture.capturedAt,
});

// Galería del usuario (más recientes primero). Los filtros de familia y clase se resuelven sobre species.
// El progreso (especies distintas capturadas / especies del catálogo) respeta familia y clase, no las fechas.
async function listByUser(userId, { year, month, family, class: speciesClass, speciesId, page, limit }) {
  const user = new mongoose.Types.ObjectId(userId);

  const filtroEspecie = {};
  if (family) filtroEspecie.family = family;
  if (speciesClass) filtroEspecie.class = speciesClass;
  const hayFiltroEspecie = Object.keys(filtroEspecie).length > 0;

  const idsEspecie = hayFiltroEspecie ? await Species.find(filtroEspecie).distinct('_id') : null;

  const filtro = { user, ...filtroFecha({ year, month }) };
  if (speciesId) filtro.species = new mongoose.Types.ObjectId(speciesId);
  if (idsEspecie) {
    // Si además se pide speciesId, tiene que pertenecer a la familia/clase pedida
    filtro.species = speciesId
      ? { $in: idsEspecie.filter((id) => id.equals(speciesId)) }
      : { $in: idsEspecie };
  }

  const filtroProgreso = { user };
  if (idsEspecie) filtroProgreso.species = { $in: idsEspecie };

  const [capturas, total, capturadas, totalEspecies] = await Promise.all([
    Capture.find(filtro)
      .sort({ capturedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('species', 'commonName scientificName family class'),
    Capture.countDocuments(filtro),
    Capture.distinct('species', filtroProgreso).then((ids) => ids.length),
    Species.countDocuments(filtroEspecie),
  ]);

  return {
    captures: capturas.map(toPublicCapture),
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      progress: { captured: capturadas, total: totalEspecies },
    },
  };
}

module.exports = { create, listByUser };

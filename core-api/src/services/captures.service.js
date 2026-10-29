// Registro y consulta de capturas.
const mongoose = require("mongoose");
const Capture = require("../models/Capture.model");
const Species = require("../models/Species.model");
const gridfsService = require("./gridfs.service");
const sightingsService = require("./sightings.service");
const locationService = require("./location.service");
const normalizeScientificName = require("../utils/normalizeScientificName");
const { AppError } = require("../utils/errors");

// Mismos umbrales que usa el Edge; el Core igual revalida porque la respuesta de la IA es entrada no confiable
const SCREEN_PROBABILITY_LIMIT = 0.5;
const MIN_ANIMAL_PROBABILITY = 0.5;

const toCreatedCapture = (capture, species) => ({
  id: capture._id,
  species: {
    id: species._id,
    commonName: species.commonName,
    scientificName: species.scientificName,
  },
  photoUrl: `/api/v1/images/${capture.photoId}`,
  location: {
    lat: capture.location.coordinates[1],
    lng: capture.location.coordinates[0],
  },
  confidence: capture.aiConfidence,
  isNewSpecies: capture.isNewSpecies,
  createdAt: capture.capturedAt,
});

// Registra una captura ya identificada por la IA: vincula la especie con el catálogo, guarda la foto en GridFS,
// la captura y su avistamiento. Si algo falla después de subir la foto, se deshace lo guardado.
async function create(userId, { imageBase64, contentType, lat, lng, ai }) {
  if (!ai.isAnimal || ai.screenProbability >= SCREEN_PROBABILITY_LIMIT) {
    throw new AppError(
      422,
      "NO_ANIMAL_DETECTED",
      "No encontramos un animal en la imagen",
    );
  }
  if (ai.animalProbability < MIN_ANIMAL_PROBABILITY) {
    throw new AppError(
      422,
      "SPECIES_NOT_RECOGNIZED",
      "Hay un animal, pero no se pudo vincular con el catálogo de especies",
    );
  }

  const species = await Species.findOne({
    scientificNameNormalized: normalizeScientificName(ai.scientificName),
  });
  if (!species) {
    throw new AppError(
      422,
      "SPECIES_NOT_RECOGNIZED",
      "Hay un animal, pero no se pudo vincular con el catálogo de especies",
    );
  }

  const isNewSpecies = !(await Capture.exists({
    user: userId,
    species: species._id,
  }));

  const photoId = await gridfsService.uploadImage({
    buffer: Buffer.from(imageBase64, "base64"),
    filename: `capture-${userId}-${Date.now()}.jpg`,
    contentType,
  });

  let capture;
  try {
    capture = await Capture.create({
      user: userId,
      species: species._id,
      photoId,
      aiConfidence: ai.animalProbability,
      location: { type: "Point", coordinates: [lng, lat] },
      h3Index: await locationService.latLngToCell(lat, lng),
      isNewSpecies,
    });
    await sightingsService.createFromCapture(capture);
  } catch (err) {
    if (capture) await Capture.deleteOne({ _id: capture._id });
    await gridfsService.deleteImage(photoId);
    throw err;
  }

  // TODO: logros desbloqueados (achievements.service) y push a usuarios cercanos
  return {
    capture: toCreatedCapture(capture, species),
    unlockedAchievements: [],
  };
}

// Rango de fechas (UTC) para año y/o mes. Mes solo = ese mes de cualquier año.
function filtroFecha({ year, month }) {
  if (year && month) {
    return {
      capturedAt: {
        $gte: new Date(Date.UTC(year, month - 1, 1)),
        $lt: new Date(Date.UTC(year, month, 1)),
      },
    };
  }
  if (year) {
    return {
      capturedAt: {
        $gte: new Date(Date.UTC(year, 0, 1)),
        $lt: new Date(Date.UTC(year + 1, 0, 1)),
      },
    };
  }
  if (month) {
    return { $expr: { $eq: [{ $month: "$capturedAt" }, month] } };
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
async function listByUser(
  userId,
  { year, month, family, class: speciesClass, speciesId, page, limit },
) {
  const user = new mongoose.Types.ObjectId(userId);

  const filtroEspecie = {};
  if (family) filtroEspecie.family = family;
  if (speciesClass) filtroEspecie.class = speciesClass;
  const hayFiltroEspecie = Object.keys(filtroEspecie).length > 0;

  const idsEspecie = hayFiltroEspecie
    ? await Species.find(filtroEspecie).distinct("_id")
    : null;

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
      .populate("species", "commonName scientificName family class"),
    Capture.countDocuments(filtro),
    Capture.distinct("species", filtroProgreso).then((ids) => ids.length),
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

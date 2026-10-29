const mongoose = require('mongoose');
const normalizeScientificName = require('../utils/normalizeScientificName');

// Campos según el modelo de datos del documento de diseño (+ class, que se usa para filtrar la enciclopedia).
const speciesSchema = new mongoose.Schema(
  {
    commonName: { type: String, required: true },
    class: { type: String, required: true },
    family: { type: String, required: true },
    scientificName: { type: String, required: true, unique: true },
    scientificNameNormalized: { type: String, required: true, unique: true }, // búsqueda desde la IA
    description: { type: String },
    habitat: { type: String },
    diet: { type: String },
    distribution: { type: String },
    conservationStatus: { type: String },
    funFacts: { type: [String], default: [] },
  },
  { timestamps: true },
);

// Se mantiene siempre derivado de scientificName
speciesSchema.pre('validate', function setNormalizedName() {
  if (this.scientificName) this.scientificNameNormalized = normalizeScientificName(this.scientificName);
});

module.exports = mongoose.model('Species', speciesSchema);

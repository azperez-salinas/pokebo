const mongoose = require('mongoose');

// Campos según el modelo de datos del documento de diseño (+ class, que se usa para filtrar la enciclopedia).
const speciesSchema = new mongoose.Schema(
  {
    commonName: { type: String, required: true },
    class: { type: String, required: true },
    family: { type: String, required: true },
    scientificName: { type: String, required: true, unique: true },
    description: { type: String },
    habitat: { type: String },
    diet: { type: String },
    distribution: { type: String },
    conservationStatus: { type: String },
    funFacts: { type: [String], default: [] },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Species', speciesSchema);

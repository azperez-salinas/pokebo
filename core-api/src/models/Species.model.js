const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const speciesSchema = new mongoose.Schema(
  {
    commonName: { type: String, required: true },
    class: { type: String, required: true },
    family: { type: String, required: true },
    scientificName: { type: String, required: true, unique: true },
    description: { type: String },
    diet: { type: String },
    category: { type: String },
    habitat: { type: String },
    funFact: { type: String },
    conservationStatus: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Species', speciesSchema);

const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const sightingSchema = new mongoose.Schema(
  {
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species', required: true },
    capture: { type: mongoose.Schema.Types.ObjectId, ref: 'Capture' },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    h3Index: { type: String },
    seenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

sightingSchema.index({ location: '2dsphere' });
sightingSchema.index({ seenAt: 1,}, { expireAfterSeconds: 3600*24 }); // Expira después de 24 horas 

module.exports = mongoose.model('Sighting', sightingSchema);

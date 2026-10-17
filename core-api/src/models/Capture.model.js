const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const captureSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species' },
    photoId: { type: mongoose.Schema.Types.ObjectId, required: true },
    aiConfidence: { type: Number, min: 0, max: 1 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    h3Index: { type: String },
    capturedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

captureSchema.index({ location: '2dsphere' });
captureSchema.index({ user: 1, capturedAt: -1 });

module.exports = mongoose.model('Capture', captureSchema);

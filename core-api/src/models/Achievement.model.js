const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const achievementSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    iconId: { type: mongoose.Schema.Types.ObjectId},
    criteria: {
      type: { type: String },
      threshold: { type: Number },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Achievement', achievementSchema);

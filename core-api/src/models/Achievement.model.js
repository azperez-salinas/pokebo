const mongoose = require('mongoose');

// El catálogo vive en src/data/achievements.catalog.js y se sincroniza al iniciar el Core (achievements.service.syncCatalog).
const achievementSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    icon: { type: String }, // clave del ícono en la app
    group: { type: String, required: true }, // sección de la pantalla de logros
    order: { type: Number, default: 0 },
    criteria: {
      type: { type: String, required: true },
      filter: { type: mongoose.Schema.Types.Mixed },
      threshold: { type: Number, required: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Achievement', achievementSchema);

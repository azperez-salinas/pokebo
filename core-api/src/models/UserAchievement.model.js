const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const userachievementSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    achievement: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
    progress: { type: Number, default: 0 },
    unlockedAt: { type: Date },
  },
  { timestamps: true },
);

userachievementSchema.index({ user: 1, achievement: 1 }, { unique: true });

module.exports = mongoose.model('UserAchievement', userachievementSchema);

const mongoose = require('mongoose');

// Avatares predefinidos: el cliente elige uno de estos códigos (no se sube archivo).
const AVATARS = ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5', 'avatar_6'];

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatar: { type: String, enum: AVATARS, default: 'avatar_1' },
    settings: {
      pushEnabled: { type: Boolean, default: false },
      nearbyAlerts: { type: Boolean, default: false },
    },
    pushTokens: [
      {
        token: { type: String, required: true },
        platform: { type: String, enum: ['ios', 'android'] },
      },
    ],
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);
module.exports.AVATARS = AVATARS;
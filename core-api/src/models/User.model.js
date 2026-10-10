const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    fullname:{type: String, required: true, trim: true},
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    dateOfBirth: { type: Date, required: true },
    passwordHash: { type: String, required: true },
    avatarId: { type: mongoose.Schema.Types.ObjectId},
    settings: {
      pushEnabled: { type: Boolean, default: false },
      nearbyAlerts: { type: Boolean, default: false }
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

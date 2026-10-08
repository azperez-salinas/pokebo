const mongoose = require('mongoose');

// TODO: validar campos contra la sección "Modelo de datos" del documento de diseño.
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    avatarUrl: { type: String },
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

// Única definición de "qué ve el cliente de un usuario": sin hash de contraseña, sin tokens de dispositivo
// y sin el campo interno __v de Mongoose.
function toPublicUser(user) {
  const { passwordHash, pushTokens, __v, ...rest } = user.toObject();
  return rest;
}

module.exports = toPublicUser;
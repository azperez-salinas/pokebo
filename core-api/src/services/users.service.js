// Operaciones sobre usuarios.
const User = require('../models/User.model');
const Capture = require('../models/Capture.model');
const Sighting = require('../models/Sighting.model');
const Notification = require('../models/Notification.model');
const UserAchievement = require('../models/UserAchievement.model');
const { deleteImage } = require('./gridfs.service');
const { revokeAllRefreshTokens } = require('./token.service');
const { AppError } = require('../utils/errors');
const toPublicUser = require('../utils/toPublicUser');

const userNotFound = () => new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
  

async function getById(userId) {
  const user = await User.findById(userId);

  if (!user) {
    throw userNotFound();
  }

  return toPublicUser(user);
}

// Actualiza solo los campos recibidos. settings se aplica campo a campo para no pisar el resto.
async function updateMe(userId, changes) {
  const current = await User.findById(userId);
  if (!current) throw userNotFound();

  const { username, bio, avatar, settings } = changes;
  const $set = {};
  if(username !== undefined) {
    if(username !== current.username && await User.exists({ username, _id: {$ne: userId} })){
      throw new AppError(409, 'USERNAME_TAKEN', 'El nombre de usuario ya está en uso');
    }
    $set.username = username;
  }
  if (bio !== undefined) $set.bio = bio;
  if (avatar !== undefined) $set.avatar = avatar;
  for (const [key, value] of Object.entries(settings || {})) {
    $set[`settings.${key}`] = value;
  }
  try {
    const user = await User.findByIdAndUpdate(userId, { $set }, { new: true, runValidators: true });
    if (!user) throw userNotFound();
    return toPublicUser(user);
  } catch (err) {
    if (err.code === 11000 && (err.keyPattern?.username || err.keyValue?.username)) {
      throw new AppError(409, 'USERNAME_TAKEN', 'El nombre de usuario ya está en uso');
    }
    throw err;

  }
}

// Registra (o actualiza) el token push del dispositivo del usuario.
async function registerPushToken(userId, token, platform) {
  // Un mismo dispositivo no puede recibir pushes de dos cuentas: si el token estaba en otra, se le quita
  await User.updateMany({ _id: { $ne: userId }, 'pushTokens.token': token }, { $pull: { pushTokens: { token } } });

  const updated = await User.updateOne(
    { _id: userId, 'pushTokens.token': token },
    { $set: { 'pushTokens.$.platform': platform } },
  );
  if (updated.matchedCount === 0) {
    const pushed = await User.updateOne({ _id: userId }, { $push: { pushTokens: { token, platform } } });
    if (pushed.matchedCount === 0) throw userNotFound();
  }
}

// Borra la cuenta y todo lo que depende de ella. Mongo standalone no tiene transacciones, así que
// el orden va de lo dependiente a lo principal: si algo falla a la mitad, reintentar es seguro.
async function deleteMe(userId) {
  if (!(await User.exists({ _id: userId }))) throw userNotFound();

  await revokeAllRefreshTokens(userId);

  const captures = await Capture.find({ user: userId }).select('photoId');
  await Promise.all(captures.map((c) => deleteImage(c.photoId)));

  await Promise.all([
    Capture.deleteMany({ user: userId }),
    Sighting.deleteMany({ user: userId }),
    Notification.deleteMany({ user: userId }),
    UserAchievement.deleteMany({ user: userId }),
  ]);
  await User.deleteOne({ _id: userId });
  // TODO: borrar la ubicación del usuario en Redis cuando location.service esté implementado
}

module.exports = { getById, updateMe, registerPushToken, deleteMe };
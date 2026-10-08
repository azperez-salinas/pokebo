const mongoose = require('mongoose');
const config = require('./index');

// Conexión a MongoDB. La URI sale de MONGO_URI; no hay credenciales en el código.
async function connectMongo() {
  // TODO: manejo de reintentos y eventos de conexión
  await mongoose.connect(config.mongoUri);
  return mongoose.connection;
}

module.exports = { connectMongo };

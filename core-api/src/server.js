const app = require('./app');
const config = require('./config');
const { connectMongo } = require('./config/mongo');
const { initGridFS } = require('./config/gridfs');
const { connectRedis } = require('./config/redis');
const achievementsService = require('./services/achievements.service');

// TODO: conectar a MongoDB (config/mongo.js) y Redis (config/redis.js) antes de escuchar.

async function startServer() {
  try {
    await connectMongo();

    initGridFS();

    await connectRedis();

    await achievementsService.syncCatalog();

    app.listen(config.port, () => {
      console.log('core-api escuchando en puerto ' + config.port);
    });

  } catch (error) {
    console.error('Error al iniciar Core API:', error);
    process.exit(1);
  }
}

startServer();
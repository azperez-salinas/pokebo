const app = require('./app');
const config = require('./config');

// TODO: conectar a MongoDB (config/mongo.js) y Redis (config/redis.js) antes de escuchar.

app.listen(config.port, () => {
  console.log('core-api escuchando en puerto ' + config.port);
});

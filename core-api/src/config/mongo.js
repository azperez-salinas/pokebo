const mongoose = require('mongoose');
const config = require('./index');


const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 2000; // 2 segundos entre reintentos

//funcion aux para esperar entre reintentos
function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


// Eventos de conexión
mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB desconectado');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconectado');
});

mongoose.connection.on('error', (error) => {
  console.error('Error de conexión MongoDB:', error.message);
});



async function connectMongo() {
  
  for (let intento = 1; intento <= MAX_RETRIES; intento++) {
    try {

      await mongoose.connect(config.mongoUri);

      console.log('Mongodb conectado');

      return; // Conexión exitosa, salir de la función
    } 
    catch (error) {

      console.error(`Intento ${intento}/${MAX_RETRIES} fallido: ${error.message}`);

       if (intento === MAX_RETRIES) {
        throw new Error('No se pudo conectar a MongoDB');
      }

      console.log(`Reintentando conexión en ${RETRY_DELAY_MS / 1000} segundos...`);
      await esperar(RETRY_DELAY_MS); // Esperar antes de reintentar

    }
  
  }
  
}

module.exports = { connectMongo };

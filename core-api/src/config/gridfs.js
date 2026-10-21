const mongoose = require('mongoose');

let bucket;

function initGridFS() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB no está conectado');
  }

  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: 'fs',
  });

  console.log('GridFS inicializado');
}

function getGridFSBucket() {
  if (!bucket) {
    throw new Error('GridFS no está inicializado');
  }

  return bucket;
}

module.exports = { initGridFS, getGridFSBucket };
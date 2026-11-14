const express = require('express');
const mongoose = require('mongoose');
const { redisClient } = require('./config/redis');
const errorHandler = require('./middlewares/error.middleware');
const { healthStatus } = require('./utils/health');

const app = express();

// El Core no es público. Su Security Group solo permite conexiones desde Edge.
app.use(express.json({ limit: '10mb' }));

// Health check del contenedor: 200 solo si MongoDB y Redis están conectados.
app.get('/health', (req, res) => {
  const { httpStatus, body } = healthStatus({
    mongoReadyState: mongoose.connection.readyState,
    redisReady: redisClient.isReady,
  });
  res.status(httpStatus).json(body);
});

app.use(require('./routes'));

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;

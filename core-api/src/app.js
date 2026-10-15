const express = require('express');
const serviceAuth = require('./middlewares/serviceAuth.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Se guarda el body crudo para verificar la firma HMAC del Edge
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// Todo lo que entra al Core tiene que venir firmado por el Edge (cualquier versión de la API)
app.use('/api', serviceAuth);

app.use(require('./routes'));

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;

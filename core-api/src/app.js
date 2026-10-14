const express = require('express');
const serviceAuth = require('./middlewares/serviceAuth.middleware');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// Se guarda el body crudo para verificar la firma HMAC del Edge
app.use(express.json({ limit: '10mb', verify: (req, res, buf) => { req.rawBody = buf; } }));

// Todo lo que entra al Core tiene que venir firmado por el Edge
app.use('/api/v1', serviceAuth);

app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/users', require('./routes/users.routes'));
app.use('/api/v1/species', require('./routes/species.routes'));
app.use('/api/v1/captures', require('./routes/captures.routes'));
app.use('/api/v1/map', require('./routes/map.routes'));
app.use('/api/v1/achievements', require('./routes/achievements.routes'));
app.use('/api/v1/notifications', require('./routes/notifications.routes'));

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;

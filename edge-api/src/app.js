const express = require('express');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// En AWS hay exactamente un proxy Caddy delante de Edge. Esto permite que req.ip use
// X-Forwarded-For para rate limiting sin confiar en cadenas arbitrarias de proxies.
app.set('trust proxy', 1);

app.use(express.json({ limit: '10mb' }));

app.use(require('./routes'));

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;

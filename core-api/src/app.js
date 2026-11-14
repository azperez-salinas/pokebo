const express = require('express');
const errorHandler = require('./middlewares/error.middleware');

const app = express();

// El Core no es público. Su Security Group solo permite conexiones desde Edge.
app.use(express.json({ limit: '10mb' }));

app.use(require('./routes'));

app.use((req, res) => res.status(404).json({ code: 'NOT_FOUND', message: 'Route not found' }));
app.use(errorHandler);

module.exports = app;

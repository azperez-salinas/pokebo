// Punto único de acople de rutas del Core. Cada versión de la API vive en routes/<version>/.
// Para sumar una versión nueva: crear routes/v2/index.js y agregar una línea acá.
const { Router } = require('express');

const router = Router();

router.use('/api/v1', require('./routes/v1'));

module.exports = router;

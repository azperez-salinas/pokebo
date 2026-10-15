const { Router } = require('express');
const appVersion = require('../middlewares/appVersion.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

const router = Router();

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });


//definir si requiere auth; por ahora no, porque la app lo consulta antes del login.
router.get('/', rateLimit, notImplemented);

module.exports = router;

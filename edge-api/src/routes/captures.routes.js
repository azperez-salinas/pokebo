const { Router } = require('express');
const appVersion = require('../middlewares/appVersion.middleware');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

const router = Router();

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

// TODO: POST / identifica la especie con ai.service y luego reenvía al Core
router.post('/', appVersion, auth, rateLimit, notImplemented);
router.get('/me', appVersion, auth, rateLimit, notImplemented);

module.exports = router;

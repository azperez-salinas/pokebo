const { Router } = require('express');
const appVersion = require('../middlewares/appVersion.middleware');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

const router = Router();

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

router.get('/me', appVersion, auth, rateLimit, notImplemented);
router.put('/me/location', appVersion, auth, rateLimit, notImplemented);

module.exports = router;

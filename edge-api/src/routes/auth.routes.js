const { Router } = require('express');
const appVersion = require('../middlewares/appVersion.middleware');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');
const { forward } = require('../services/forward.service');

const router = Router();

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

// register y login NO pasan por auth.middleware
router.post('/register', appVersion, rateLimit, forward);
router.post('/login', appVersion, rateLimit, forward);
router.post('/refresh', appVersion, auth, rateLimit, notImplemented);

module.exports = router;

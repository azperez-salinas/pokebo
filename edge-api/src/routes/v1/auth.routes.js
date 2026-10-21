const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const { forward } = require('../../services/forward.service');

const router = Router();

// register, login, refresh, forgot-password y reset-password NO pasan por auth.middleware (refresh se pide justamente cuando el access token ya no sirve)
router.post('/register', appVersion, rateLimit, forward);
router.post('/login', appVersion, rateLimit, forward);
router.put('/password', appVersion, auth, rateLimit, forward);
router.post('/refresh', appVersion, rateLimit, forward);
router.post('/forgot-password', appVersion, rateLimit, forward);
router.post('/reset-password', appVersion, rateLimit, forward);
router.post('/verify-email', appVersion, rateLimit, forward);
router.post('/logout', appVersion, rateLimit, forward);

module.exports = router;

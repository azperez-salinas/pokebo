const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const { forward } = require('../../services/forward.service');
const controller = require('../../controllers/auth.controller');

const router = Router();

// register, login, refresh, forgot-password y reset-password NO pasan por auth.middleware (refresh se pide justamente cuando el access token ya no sirve)
router.post('/register', appVersion, rateLimit.registration, controller.forwardWithEmailDelivery);
router.post('/registrations', appVersion, rateLimit.registration, controller.forwardWithEmailDelivery);
router.post('/registrations/verify', appVersion, rateLimit.registration, forward);
router.post('/registrations/resend', appVersion, rateLimit.registration, controller.forwardWithEmailDelivery);
router.post('/login', appVersion, rateLimit.login, controller.forwardWithEmailDelivery);
router.post('/login/verify', appVersion, rateLimit.login, forward);
router.post('/login/resend', appVersion, rateLimit.login, controller.forwardWithEmailDelivery);
router.put('/password', appVersion, auth, rateLimit, forward);
router.post('/refresh', appVersion, rateLimit, forward);
router.post('/forgot-password', appVersion, rateLimit, forward);
router.post('/reset-password', appVersion, rateLimit, forward);
router.post('/logout', appVersion, rateLimit, forward);

module.exports = router;

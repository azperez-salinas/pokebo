const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const { forward } = require('../../services/forward.service');

const router = Router();

const notImplemented = (req, res) =>
  res.status(501).json({
    code: 'NOT_IMPLEMENTED',
    message: 'TODO'
  });

router.get('/me', appVersion, rateLimit, auth, forward);
router.patch('/me', appVersion, rateLimit, auth, forward);
router.put('/me/push-token', appVersion, rateLimit, auth, forward);
router.put('/me/location', appVersion, rateLimit, auth, forward);
router.delete('/me', appVersion, rateLimit, auth, forward);

module.exports = router;
const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const upload = require('../../middlewares/upload.middleware');
const controller = require('../../controllers/captures.controller');

const router = Router();

const notImplemented = (req, res) => res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'TODO' });

// POST / identifica la especie con ai.service y luego reenvía al Core
router.post('/', appVersion, auth, rateLimit, upload, controller.create);
router.get('/me', appVersion, auth, rateLimit, notImplemented);

module.exports = router;

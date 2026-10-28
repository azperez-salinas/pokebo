const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const upload = require('../../middlewares/upload.middleware');
const controller = require('../../controllers/captures.controller');
const { forward } = require('../../services/forward.service');

const router = Router();

// POST / identifica la especie con ai.service y luego reenvía al Core
router.post('/', appVersion, auth, rateLimit, upload, controller.create);
router.get('/me', appVersion, auth, rateLimit, forward);

module.exports = router;

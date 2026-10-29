const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const { forwardImagen } = require('../../services/forward.service');

const router = Router();

router.get('/:id', appVersion, auth, rateLimit, forwardImagen);

module.exports = router;

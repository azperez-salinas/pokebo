const { Router } = require('express');
const appVersion = require('../../middlewares/appVersion.middleware');
const auth = require('../../middlewares/auth.middleware');
const rateLimit = require('../../middlewares/rateLimit.middleware');
const { forward } = require('../../services/forward.service');

const router = Router();

router.get('/', appVersion, rateLimit, auth, forward);
router.patch('/read-all', appVersion, rateLimit, auth, forward);
router.patch('/:id', appVersion, rateLimit, auth, forward);

module.exports = router;

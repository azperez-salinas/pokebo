const { Router } = require('express');

const router = Router();

router.use('/auth', require('./auth.routes'));
router.use('/users', require('./users.routes'));
router.use('/species', require('./species.routes'));
router.use('/captures', require('./captures.routes'));
router.use('/images', require('./images.routes'));
router.use('/map', require('./map.routes'));
router.use('/achievements', require('./achievements.routes'));
router.use('/notifications', require('./notifications.routes'));

module.exports = router;

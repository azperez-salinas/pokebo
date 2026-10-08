const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/users.controller');

const router = Router();

router.get('/me', auth, controller.getMe);
router.put('/me/location', auth, controller.updateMyLocation);

module.exports = router;

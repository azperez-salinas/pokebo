const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const controller = require('../controllers/notifications.controller');

const router = Router();

router.get('/', auth, controller.list);

module.exports = router;

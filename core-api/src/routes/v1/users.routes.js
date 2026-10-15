const { Router } = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('../../validators/users.validator');
const controller = require('../../controllers/users.controller');

const router = Router();

router.get('/me', auth, controller.getMe);
router.patch('/me', auth, validate(schemas.updateMe), controller.updateMe);
router.put('/me/push-token', auth, validate(schemas.pushToken), controller.registerPushToken);
router.put('/me/location', auth, controller.updateMyLocation);
router.delete('/me', auth, controller.deleteMe);

module.exports = router;
const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const serviceAuth = require('../middlewares/serviceAuth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/auth.validator');
const controller = require('../controllers/auth.controller');

const router = Router();

router.post('/register', serviceAuth, validate(schemas.register), controller.register);
router.post('/login', serviceAuth, validate(schemas.login), controller.login);
router.put('/password', serviceAuth, auth, validate(schemas.changePassword), controller.changePassword);
router.post('/refresh', auth, validate(schemas.refresh), controller.refresh);

module.exports = router;

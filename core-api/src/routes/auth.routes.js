const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/auth.validator');
const controller = require('../controllers/auth.controller');

const router = Router();

router.post('/register', validate(schemas.register), controller.register);
router.post('/login', validate(schemas.login), controller.login);
router.post('/refresh', auth, validate(schemas.refresh), controller.refresh);

module.exports = router;

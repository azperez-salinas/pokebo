const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/auth.validator');
const controller = require('../controllers/auth.controller');

// serviceAuth (firma HMAC del Edge) ya está montado global en app.js para todo /api/v1
const router = Router();

router.post('/register', validate(schemas.register), controller.register);
router.post('/login', validate(schemas.login), controller.login);
router.put('/password', auth, validate(schemas.changePassword), controller.changePassword);
router.post('/refresh', validate(schemas.refresh), controller.refresh);

module.exports = router;

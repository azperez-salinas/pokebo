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

// Revertido a stub a propósito (sin auth ni validate) hasta que se implemente el refresh de verdad.
// La base en Redis ya está en services/token.service.js (findRefreshToken / revokeRefreshToken).
router.post('/refresh', controller.refresh);

module.exports = router;

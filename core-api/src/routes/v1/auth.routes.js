const { Router } = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('../../validators/auth.validator');
const controller = require('../../controllers/auth.controller');

const router = Router();

// /register queda como alias seguro para clientes en transicion: ya no crea usuarios ni emite tokens.
router.post('/register', validate(schemas.register), controller.startRegistration);
router.post('/registrations', validate(schemas.register), controller.startRegistration);
router.post('/registrations/verify', validate(schemas.verifyRegistration), controller.verifyRegistration);
router.post('/registrations/resend', validate(schemas.resendRegistration), controller.resendRegistration);
router.post('/login', validate(schemas.login), controller.login);
router.post('/login/verify', validate(schemas.verifyLogin), controller.verifyLogin);
router.post('/login/resend', validate(schemas.resendLogin), controller.resendLogin);
router.put('/password', auth, validate(schemas.changePassword), controller.changePassword);
router.post('/refresh', validate(schemas.refresh), controller.refresh);
// Logout sin auth: el access token puede haber vencido, lo que se revoca es el refresh token del body
router.post('/logout', validate(schemas.logout), controller.logout);
// Recuperación de contraseña: sin auth, el usuario no está logueado
router.post('/forgot-password', validate(schemas.forgotPassword), controller.forgotPassword);
router.post('/reset-password', validate(schemas.resetPassword), controller.resetPassword);

module.exports = router;

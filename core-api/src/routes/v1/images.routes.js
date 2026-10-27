const { Router } = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('../../validators/images.validator');
const controller = require('../../controllers/images.controller');

const router = Router();

router.get('/:id', auth, validate(schemas.getById), controller.getById);

module.exports = router;

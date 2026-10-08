const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/species.validator');
const controller = require('../controllers/species.controller');

const router = Router();

router.get('/', auth, validate(schemas.list), controller.list);
router.get('/:id', auth, validate(schemas.getById), controller.getById);

module.exports = router;

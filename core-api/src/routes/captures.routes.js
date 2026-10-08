const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const schemas = require('../validators/captures.validator');
const controller = require('../controllers/captures.controller');

const router = Router();

router.post('/', auth, validate(schemas.create), controller.create);
router.get('/me', auth, controller.listMine);

module.exports = router;

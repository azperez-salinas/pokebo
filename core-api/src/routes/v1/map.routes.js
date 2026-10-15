const { Router } = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('../../validators/map.validator');
const controller = require('../../controllers/map.controller');

const router = Router();

router.get('/sightings', auth, validate(schemas.sightings), controller.listSightings);

module.exports = router;

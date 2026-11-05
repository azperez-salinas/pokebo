const { Router } = require('express');
const auth = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validate.middleware');
const schemas = require('../../validators/notifications.validator');
const controller = require('../../controllers/notifications.controller');

const router = Router();

router.get('/', auth, validate(schemas.list), controller.list);
// read-all va antes de /:id para que no se lo tome como un id
router.patch('/read-all', auth, validate(schemas.markAllRead), controller.markAllRead);
router.patch('/:id', auth, validate(schemas.markRead), controller.markRead);

module.exports = router;

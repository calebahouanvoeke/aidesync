const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/interventionController');
const { isAuthenticated } = require('../middlewares/auth');
const { createLimiter, validateParamId } = require('../middlewares/security');

router.get('/',          isAuthenticated, controller.index);
router.get('/create',    isAuthenticated, controller.create);
router.get('/api/day',   isAuthenticated, controller.apiDay);
router.post('/',         isAuthenticated, createLimiter, controller.store);
router.post('/:id/done', isAuthenticated, validateParamId, controller.markAsDone);
router.delete('/:id',    isAuthenticated, validateParamId, controller.destroy);

module.exports = router;
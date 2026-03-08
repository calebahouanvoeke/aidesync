const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/profileController');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/',   isAuthenticated, controller.showProfil);
router.post('/',  isAuthenticated, controller.updateProfil);
router.get('/parametres',                isAuthenticated, controller.showParametres);
router.post('/parametres/password',      isAuthenticated, controller.updatePassword);
router.post('/parametres/notifications', isAuthenticated, controller.updateNotifications);

module.exports = router;
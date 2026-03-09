// ============================================================
// ROUTES MESSAGES
// ============================================================

const express    = require('express');
const router     = express.Router();
const messageController = require('../controllers/messageController');
const { isAuthenticated } = require('../middlewares/auth');
const { createLimiter, validateParamId } = require('../middlewares/security');

// GET /messages — Liste des conversations
router.get('/', isAuthenticated, messageController.index);


router.get('/unread-count', isAuthenticated, messageController.getUnreadCount);


router.get('/:clientId', isAuthenticated, validateParamId, messageController.show);
router.post('/:clientId', isAuthenticated, validateParamId, createLimiter, messageController.send);
router.post('/:clientId/read', isAuthenticated, validateParamId, messageController.markAsRead);

module.exports = router;
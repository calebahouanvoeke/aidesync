// ============================================================
// ROUTES MESSAGES
// ============================================================

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { isAuthenticated } = require('../middlewares/auth');

// routes/messages.js

router.get('/', isAuthenticated, messageController.index);


router.get('/unread-count', isAuthenticated, messageController.getUnreadCount);

router.get('/:clientId', isAuthenticated, messageController.show);

router.post('/:clientId', isAuthenticated, messageController.send);
router.post('/:clientId/read', isAuthenticated, messageController.markAsRead);

module.exports = router;
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

// GET /messages/unread-count — Compteur non lus (API)
router.get('/unread-count', isAuthenticated, messageController.getUnreadCount);

// GET /messages/:clientId — Conversation avec un client
router.get('/:clientId', isAuthenticated, validateParamId, messageController.show);

// POST /messages/:clientId — Envoyer un message (limité à 30 / 10 min)
router.post('/:clientId', isAuthenticated, validateParamId, createLimiter, messageController.send);

// POST /messages/:clientId/read — Marquer comme lu
router.post('/:clientId/read', isAuthenticated, validateParamId, messageController.markAsRead);

module.exports = router;
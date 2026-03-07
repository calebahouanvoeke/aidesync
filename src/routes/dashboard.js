// ============================================================
// ROUTES DU TABLEAU DE BORD
// ============================================================

const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/auth');

/**
 * Afficher le tableau de bord
 * GET /dashboard
 */
router.get('/', isAuthenticated, dashboardController.index);

/**
 * API - Obtenir les statistiques
 * GET /dashboard/stats
 */
router.get('/stats', isAuthenticated, dashboardController.getStats);

module.exports = router;
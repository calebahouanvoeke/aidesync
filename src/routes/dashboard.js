// ============================================================
// ROUTES TABLEAU DE BORD
// ============================================================

const express    = require('express');
const router     = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { isAuthenticated } = require('../middlewares/auth');
const { apiLimiter } = require('../middlewares/security');

// GET /dashboard
router.get('/', isAuthenticated, dashboardController.index);

// GET /dashboard/stats — API stats (limité à 200 req / 15 min)
router.get('/stats', isAuthenticated, apiLimiter, dashboardController.getStats);

module.exports = router;
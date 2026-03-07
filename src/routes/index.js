// ============================================================
// ROUTES PRINCIPALES
// ============================================================

const express = require('express');
const router = express.Router();

/**
 * Page d'accueil (redirection)
 */
router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  res.redirect('/auth/login');
});

module.exports = router;
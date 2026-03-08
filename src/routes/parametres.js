// ============================================================
// ROUTES PARAMÈTRES
// Ajouter dans src/routes/parametres.js (nouveau fichier)
// ============================================================

const express = require('express');
const router  = express.Router();
const profil  = require('../controllers/profileController');
const { isAuthenticated } = require('../middlewares/auth');

// Paramètres
router.get('/',                    isAuthenticated, profil.settings);
router.post('/password',           isAuthenticated, profil.updatePassword);
router.post('/notifications',      isAuthenticated, profil.updateNotifications);

module.exports = router;
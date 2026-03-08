// ============================================================
// ROUTES PROFIL & PARAMÈTRES
// Ajouter dans src/routes/profil.js (nouveau fichier)
// ============================================================

const express    = require('express');
const router     = express.Router();
const profil     = require('../controllers/profileController');
const { isAuthenticated } = require('../middlewares/auth');

// Profil
router.get('/',       isAuthenticated, profil.show);
router.post('/',      isAuthenticated, profil.update);

module.exports = router;
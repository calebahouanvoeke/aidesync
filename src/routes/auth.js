// ============================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middlewares/auth');
const { registerValidation, loginValidation, checkValidation } = require('../middlewares/validator');

/**
 * Afficher le formulaire de connexion
 * GET /auth/login
 */
router.get('/login', isGuest, authController.showLogin);

/**
 * Traiter la connexion
 * POST /auth/login
 */
router.post('/login', isGuest, loginValidation, checkValidation, authController.login);

/**
 * Afficher le formulaire d'inscription
 * GET /auth/register
 */
router.get('/register', isGuest, authController.showRegister);

/**
 * Traiter l'inscription
 * POST /auth/register
 */
router.post('/register', isGuest, registerValidation, checkValidation, authController.register);

/**
 * Déconnexion
 * POST /auth/logout
 */
router.post('/logout', authController.logout);

/**
 * Déconnexion (GET pour compatibilité)
 * GET /auth/logout
 */
router.get('/logout', authController.logout);

module.exports = router;
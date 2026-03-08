// ============================================================
// ROUTES D'AUTHENTIFICATION
// ============================================================

const express    = require('express');
const router     = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middlewares/auth');
const { registerValidation, loginValidation, checkValidation } = require('../middlewares/validator');
const { loginLimiter, createLimiter } = require('../middlewares/security');

// GET /auth/login
router.get('/login', isGuest, authController.showLogin);

// POST /auth/login — limité à 10 tentatives / 15 min
router.post('/login', isGuest, loginLimiter, loginValidation, checkValidation, authController.login);

// GET /auth/register
router.get('/register', isGuest, authController.showRegister);

// POST /auth/register — limité à 5 inscriptions / 15 min par IP
router.post('/register', isGuest, createLimiter, registerValidation, checkValidation, authController.register);

// POST /auth/logout
router.post('/logout', authController.logout);

// GET /auth/logout (compatibilité)
router.get('/logout', authController.logout);

module.exports = router;
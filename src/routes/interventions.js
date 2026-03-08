// ============================================================
// src/routes/interventions.js  — VERSION COMPLÈTE CORRIGÉE
// ============================================================

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/interventionController');

// ── Adapter selon le nom exact de ton middleware auth ──────
// Essaie d'importer les deux noms possibles pour compatibilité
const authMiddleware = require('../middlewares/auth');
const isAuthenticated = authMiddleware.isAuthenticated
  || authMiddleware.ensureAuthenticated
  || authMiddleware.default
  || ((req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) return next();
    res.redirect('/login');
  });

const { createLimiter, validateParamId, apiLimiter } = require('../middlewares/security');

// ── IMPORTANT : routes statiques AVANT les routes dynamiques /:id ──

// GET /interventions — Planning
router.get('/', isAuthenticated, controller.index);

// GET /interventions/create — Formulaire (supporte ?date=YYYY-MM-DD)
router.get('/create', isAuthenticated, controller.create);

// GET /interventions/api/day?date=YYYY-MM-DD — API interne chevauchement
// DOIT être avant /:id sinon Express interprète "api" comme un :id
router.get('/api/day', isAuthenticated, apiLimiter, controller.apiDay);

// POST /interventions — Créer
router.post('/', isAuthenticated, createLimiter, controller.store);

// POST /interventions/:id/done — Marquer comme effectuée
router.post('/:id/done', isAuthenticated, validateParamId, controller.markAsDone);

// DELETE /interventions/:id — Supprimer
router.delete('/:id', isAuthenticated, validateParamId, controller.destroy);

module.exports = router;
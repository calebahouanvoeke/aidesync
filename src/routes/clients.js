// ============================================================
// ROUTES CLIENTS
// ============================================================

const express    = require('express');
const router     = express.Router();
const clientController = require('../controllers/clientController');
const { isAuthenticated } = require('../middlewares/auth');
const { clientValidation, checkValidation } = require('../middlewares/validator');
const { createLimiter, validateParamId } = require('../middlewares/security');

// GET /clients — Liste
router.get('/', isAuthenticated, clientController.index);

// GET /clients/create — Formulaire
router.get('/create', isAuthenticated, clientController.create);

// POST /clients — Créer (limité à 30 créations / 10 min)
router.post('/', isAuthenticated, createLimiter, clientValidation, checkValidation, clientController.store);

// GET /clients/:id — Afficher
router.get('/:id', isAuthenticated, validateParamId, clientController.show);

// GET /clients/:id/edit — Formulaire modification
router.get('/:id/edit', isAuthenticated, validateParamId, clientController.edit);

// PUT /clients/:id — Mettre à jour
router.put('/:id', isAuthenticated, validateParamId, clientValidation, checkValidation, clientController.update);

// DELETE /clients/:id — Désactiver
router.delete('/:id', isAuthenticated, validateParamId, clientController.destroy);

module.exports = router;
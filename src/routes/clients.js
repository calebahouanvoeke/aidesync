// ============================================================
// ROUTES CLIENTS
// ============================================================

const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { isAuthenticated } = require('../middlewares/auth');
const { clientValidation, checkValidation } = require('../middlewares/validator');

/**
 * Liste des clients
 * GET /clients
 */
router.get('/', isAuthenticated, clientController.index);

/**
 * Afficher le formulaire de création
 * GET /clients/create
 */
router.get('/create', isAuthenticated, clientController.create);

/**
 * Enregistrer un nouveau client
 * POST /clients
 */
router.post('/', isAuthenticated, clientValidation, checkValidation, clientController.store);

/**
 * Afficher un client
 * GET /clients/:id
 */
router.get('/:id', isAuthenticated, clientController.show);

/**
 * Afficher le formulaire de modification
 * GET /clients/:id/edit
 */
router.get('/:id/edit', isAuthenticated, clientController.edit);

/**
 * Mettre à jour un client
 * PUT /clients/:id
 */
router.put('/:id', isAuthenticated, clientValidation, checkValidation, clientController.update);

/**
 * Désactiver un client
 * DELETE /clients/:id
 */
router.delete('/:id', isAuthenticated, clientController.destroy);

module.exports = router;
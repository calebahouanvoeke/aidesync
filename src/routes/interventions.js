// ============================================================
// ROUTES INTERVENTIONS
// ============================================================

const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/interventionController');
const { isAuthenticated } = require('../middlewares/auth');
const { interventionValidation, checkValidation } = require('../middlewares/validator');

/**
 * Afficher le planning
 * GET /interventions
 */
router.get('/', isAuthenticated, interventionController.index);

/**
 * Afficher le formulaire de création
 * GET /interventions/create
 */
router.get('/create', isAuthenticated, interventionController.create);

/**
 * Enregistrer une intervention
 * POST /interventions
 */
router.post('/', isAuthenticated, interventionValidation, checkValidation, interventionController.store);

/**
 * Marquer comme effectuée
 * POST /interventions/:id/done
 */
router.post('/:id/done', isAuthenticated, interventionController.markAsDone);

/**
 * Supprimer une intervention
 * DELETE /interventions/:id
 */
router.delete('/:id', isAuthenticated, interventionController.destroy);

module.exports = router;
// ============================================================
// ROUTES FACTURES
// ============================================================

const express = require('express');
const router = express.Router();
const factureController = require('../controllers/factureController');
const { isAuthenticated } = require('../middlewares/auth');

/**
 * Liste des factures
 * GET /factures
 */
router.get('/', isAuthenticated, factureController.index);


/**
 * Invalider une déclaration de paiement
 * POST /factures/:id/invalidate-payment
 */
router.post('/:id/invalidate-payment', isAuthenticated, async (req, res) => {
  try {
    const factureId = req.params.id;
    const prestataireId = req.user.id;
    const { raison } = req.body;
    
    const Facture = require('../models/Facture');
    const Client = require('../models/Client');
    const EmailService = require('../services/emailService');
    
    // Vérifier que la facture appartient au prestataire
    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }
    
    // Invalider le paiement
    const facture = await Facture.invaliderDeclarationPaiement(factureId, raison || 'Paiement non reçu');
    
    // Notifier le client par email
    const client = await Client.findById(facture.client_id);
    if (client.email) {
      await EmailService.notifyPaymentInvalidated(client, facture, raison);
    }
    
    res.json({ success: true, message: 'Paiement invalidé' });
    
  } catch (error) {
    console.error('Erreur invalidation paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'invalidation' });
  }
});


/**
 * Afficher une facture
 * GET /factures/:id
 */
router.get('/:id', isAuthenticated, factureController.show);

/**
 * Générer les factures du mois
 * POST /factures/generate
 */
router.post('/generate', isAuthenticated, factureController.generateMonthly);

/**
 * Marquer comme payée
 * POST /factures/:id/paid
 */
router.post('/:id/paid', isAuthenticated, factureController.markAsPaid);

/**
 * Télécharger une facture en PDF
 * GET /factures/:id/pdf
 */
router.get('/:id/pdf', isAuthenticated, factureController.downloadPDF);

/**
 * Envoyer une facture par email
 * POST /factures/:id/email
 */
router.post('/:id/email', isAuthenticated, factureController.sendEmail);

module.exports = router;
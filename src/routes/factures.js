// ============================================================
// ROUTES FACTURES
// ============================================================

const express    = require('express');
const router     = express.Router();
const factureController = require('../controllers/factureController');
const { isAuthenticated } = require('../middlewares/auth');
const { createLimiter, emailLimiter, validateParamId } = require('../middlewares/security');

// GET /factures — Liste
router.get('/', isAuthenticated, factureController.index);

// POST /factures/:id/invalidate-payment — Invalider un paiement déclaré
router.post('/:id/invalidate-payment', isAuthenticated, validateParamId, async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;
    const { raison }    = req.body;

    const Facture      = require('../models/Facture');
    const Client       = require('../models/Client');
    const EmailService = require('../services/emailService');

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    const facture = await Facture.invaliderDeclarationPaiement(factureId, raison || 'Paiement non reçu');

    const client = await Client.findById(facture.client_id);
    if (client && client.email) {
      await EmailService.notifyPaymentInvalidated(client, facture, raison);
    }

    res.json({ success: true, message: 'Paiement invalidé' });

  } catch (error) {
    console.error('Erreur invalidation paiement:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'invalidation' });
  }
});

// GET /factures/:id — Afficher une facture
router.get('/:id', isAuthenticated, validateParamId, factureController.show);

// POST /factures/generate — Générer les factures du mois (limité à 10 / heure)
router.post('/generate', isAuthenticated, createLimiter, factureController.generateMonthly);

// POST /factures/:id/paid — Marquer comme payée
router.post('/:id/paid', isAuthenticated, validateParamId, factureController.markAsPaid);

// GET /factures/:id/pdf — Télécharger PDF
router.get('/:id/pdf', isAuthenticated, validateParamId, factureController.downloadPDF);

// POST /factures/:id/email — Envoyer par email (limité à 20 / heure)
router.post('/:id/email', isAuthenticated, validateParamId, emailLimiter, factureController.sendEmail);

module.exports = router;
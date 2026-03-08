// ============================================================
// ROUTES PORTAIL CLIENT
// ============================================================

const express    = require('express');
const router     = express.Router();
const clientPortalController = require('../controllers/clientPortalController');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const { createLimiter, apiLimiter } = require('../middlewares/security');

// ── Upload preuves de paiement ──────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/preuves-paiement');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `preuve-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Format non autorisé. Utilisez JPG, PNG ou PDF.'));
  }
});

// ── Validation token (protection basique) ──────────────────
const validateToken = (req, res, next) => {
  const token = req.params.token;
  // Token doit être alphanumérique, longueur raisonnable
  if (!token || !/^[a-zA-Z0-9_-]{10,128}$/.test(token)) {
    return res.status(404).send('Accès non valide');
  }
  next();
};

// ── Validation factureId ────────────────────────────────────
const validateFactureId = (req, res, next) => {
  const id = req.params.factureId;
  if (!id || !/^\d+$/.test(id) || parseInt(id) <= 0) {
    return res.status(400).json({ success: false, message: 'ID invalide' });
  }
  next();
};

// GET /:token — Dashboard client
router.get('/:token', validateToken, apiLimiter, clientPortalController.dashboard);

// GET /:token/interventions
router.get('/:token/interventions', validateToken, apiLimiter, clientPortalController.interventions);

// GET /:token/factures
router.get('/:token/factures', validateToken, apiLimiter, clientPortalController.factures);

// GET /:token/factures/:factureId/pdf — Télécharger PDF
router.get('/:token/factures/:factureId/pdf', validateToken, validateFactureId, async (req, res) => {
  try {
    const { token, factureId } = req.params;

    const Client      = require('../models/Client');
    const Facture     = require('../models/Facture');
    const PDFService  = require('../services/pdfService');
    const Prestataire = require('../models/Prestataire');

    const client = await Client.findBySecureLink(token);
    if (!client) return res.status(404).send('Accès non valide');

    const facture = await Facture.findById(factureId);
    if (!facture || facture.client_id !== client.id) {
      return res.status(404).send('Facture introuvable');
    }

    const lignes      = await Facture.getLines(factureId);
    const prestataire = await Prestataire.findById(client.prestataire_id);

    // Génère en mémoire — pas de dépendance au disque
    const pdfBuffer = await PDFService.generateFacturePDFBuffer(facture, lignes, prestataire, client);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${facture.numero_facture}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erreur téléchargement PDF client:', error);
    res.status(500).send('Erreur lors du téléchargement');
  }
});

// POST /:token/factures/:factureId/declare-paid — Déclarer un paiement
router.post(
  '/:token/factures/:factureId/declare-paid',
  validateToken,
  validateFactureId,
  createLimiter,      // max 30 déclarations / 10 min par IP
  upload.single('preuve'),
  async (req, res) => {
    try {
      const { token, factureId } = req.params;

      const Client       = require('../models/Client');
      const Facture      = require('../models/Facture');
      const Notification = require('../models/Notification');
      const EmailService = require('../services/emailService');
      const Prestataire  = require('../models/Prestataire');

      const client = await Client.findBySecureLink(token);
      if (!client) return res.status(404).json({ success: false, message: 'Accès non valide' });

      const facture = await Facture.findById(factureId);
      if (!facture || facture.client_id !== client.id) {
        return res.status(404).json({ success: false, message: 'Facture introuvable' });
      }

      // Bloquer si déjà payée
      if (facture.statut === 'payee') {
        return res.status(400).json({ success: false, message: 'Cette facture est déjà marquée comme payée' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Preuve de paiement obligatoire (photo ou PDF)' });
      }

      const preuvePath = `/preuves-paiement/${req.file.filename}`;

      await Facture.declarerPaiementAvecPreuve(factureId, {
        preuve_path:        preuvePath,
        methode_paiement:   req.body.methode_paiement,
        numero_transaction: req.body.numero_transaction,
        notes:              req.body.notes ? String(req.body.notes).slice(0, 500) : null
      });

      const factureUpdated = await Facture.findById(factureId);

      await Notification.create({
        prestataire_id: client.prestataire_id,
        client_id:      client.id,
        type:           'paiement_declare',
        titre:          'Paiement déclaré avec preuve',
        message:        `${client.prenom} ${client.nom} a déclaré avoir payé la facture ${facture.numero_facture}`,
        lien:           `/factures/${factureId}`
      });

      const prestataire = await Prestataire.findById(client.prestataire_id);
      await EmailService.notifyPaymentDeclared(prestataire, client, factureUpdated);

      res.json({ success: true, message: 'Paiement déclaré avec succès. Le prestataire va le vérifier.' });

    } catch (error) {
      console.error('Erreur déclaration paiement:', error);
      res.status(500).json({ success: false, message: error.message || 'Erreur lors de la déclaration' });
    }
  }
);

// GET /:token/messages
router.get('/:token/messages', validateToken, apiLimiter, clientPortalController.messages);

// POST /:token/messages — Envoyer message (limité)
router.post('/:token/messages', validateToken, createLimiter, clientPortalController.sendMessage);

module.exports = router;
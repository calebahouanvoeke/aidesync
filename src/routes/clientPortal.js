// ============================================================
// ROUTES PORTAIL CLIENT
// ============================================================

const express = require('express');
const router = express.Router();
const clientPortalController = require('../controllers/clientPortalController');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuration multer pour upload de preuves de paiement
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/preuves-paiement');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `preuve-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Format de fichier non autorisé. Utilisez JPG, PNG ou PDF.'));
    }
  }
});

/**
 * Dashboard client
 */
router.get('/:token', clientPortalController.dashboard);

/**
 * Interventions du client
 */
router.get('/:token/interventions', clientPortalController.interventions);

/**
 * Factures du client
 */
router.get('/:token/factures', clientPortalController.factures);

/**
 * Télécharger une facture en PDF
 */
router.get('/:token/factures/:factureId/pdf', async (req, res) => {
  try {
    const token = req.params.token;
    const factureId = req.params.factureId;
    
    const Client = require('../models/Client');
    const Facture = require('../models/Facture');
    
    const client = await Client.findBySecureLink(token);
    if (!client) {
      return res.status(404).send('Accès non valide');
    }
    
    const facture = await Facture.findById(factureId);
    if (!facture || facture.client_id !== client.id) {
      return res.status(404).send('Facture introuvable');
    }
    
    // TOUJOURS régénérer le PDF pour avoir la dernière version
    const PDFService = require('../services/pdfService');
    const Prestataire = require('../models/Prestataire');
    
    const lignes = await Facture.getLines(factureId);
    const prestataire = await Prestataire.findById(client.prestataire_id);
    
    const pdfPath = await PDFService.generateFacturePDF(facture, lignes, prestataire, client);
    await Facture.updatePdfPath(factureId, pdfPath);
    
    const filepath = path.join(__dirname, '../../public', pdfPath);
    res.download(filepath, `facture-${facture.numero_facture}.pdf`);
    
  } catch (error) {
    console.error('Erreur téléchargement PDF client:', error);
    res.status(500).send('Erreur lors du téléchargement');
  }
});
/**
 * Déclarer un paiement avec preuve obligatoire
 */
router.post('/:token/factures/:factureId/declare-paid', upload.single('preuve'), async (req, res) => {
  try {
    const token = req.params.token;
    const factureId = req.params.factureId;
    
    const Client = require('../models/Client');
    const Facture = require('../models/Facture');
    const Notification = require('../models/Notification');
    const EmailService = require('../services/emailService');
    const Prestataire = require('../models/Prestataire');
    
    // Vérifier le client
    const client = await Client.findBySecureLink(token);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Accès non valide' });
    }
    
    // Vérifier la facture
    const facture = await Facture.findById(factureId);
    if (!facture || facture.client_id !== client.id) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }
    
    // Vérifier qu'un fichier a été uploadé
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'Preuve de paiement obligatoire (photo ou PDF)' 
      });
    }
    
    const preuvePath = `/preuves-paiement/${req.file.filename}`;
    
    // Déclarer le paiement avec preuve
    await Facture.declarerPaiementAvecPreuve(factureId, {
      preuve_path: preuvePath,
      methode_paiement: req.body.methode_paiement,
      numero_transaction: req.body.numero_transaction,
      notes: req.body.notes
    });
    
    // Récupérer la facture mise à jour
    const factureUpdated = await Facture.findById(factureId);
    
    // Créer une notification pour le prestataire
    await Notification.create({
      prestataire_id: client.prestataire_id,
      client_id: client.id,
      type: 'paiement_declare',
      titre: 'Paiement déclaré avec preuve',
      message: `${client.prenom} ${client.nom} a déclaré avoir payé la facture ${facture.numero_facture} par ${req.body.methode_paiement}`,
      lien: `/factures/${factureId}`
    });
    
    // Envoyer email au prestataire avec preuve en PJ
    const prestataire = await Prestataire.findById(client.prestataire_id);
    await EmailService.notifyPaymentDeclared(prestataire, client, factureUpdated);
    
    res.json({ success: true, message: 'Paiement déclaré avec succès. Le prestataire va le vérifier.' });
    
  } catch (error) {
    console.error('Erreur déclaration paiement:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la déclaration' 
    });
  }
});

/**
 * Messages du client
 */
router.get('/:token/messages', clientPortalController.messages);

/**
 * Envoyer un message
 */
router.post('/:token/messages', clientPortalController.sendMessage);

module.exports = router;
// ============================================================
// CONTRÔLEUR FACTURES
// ============================================================

const Facture      = require('../models/Facture');
const Client       = require('../models/Client');
const Prestataire  = require('../models/Prestataire');
const PDFService   = require('../services/pdfService');
const EmailService = require('../services/emailService');
const path         = require('path');

// ─────────────────────────────────────────────────────────────
// Liste des factures
// ─────────────────────────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const filters = {
      statut: req.query.statut,
      annee:  req.query.annee,
      mois:   req.query.mois
    };

    const factures = await Facture.findByPrestataire(prestataireId, filters);
    const stats    = await Facture.getStatistics(prestataireId, filters.annee);

    res.render('pages/factures/index', {
      title: 'Factures - AideSync',
      factures, stats, filters,
      currentPage: 'factures'
    });

  } catch (error) {
    console.error('Erreur liste factures:', error);
    req.flash('error', 'Erreur lors du chargement des factures');
    res.redirect('/dashboard');
  }
};

// ─────────────────────────────────────────────────────────────
// Afficher une facture
// ─────────────────────────────────────────────────────────────
exports.show = async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Facture introuvable');
      return res.redirect('/factures');
    }

    const facture = await Facture.findById(factureId);
    const lignes  = await Facture.getLines(factureId);

    res.render('pages/factures/show', {
      title: `Facture ${facture.numero_facture} - AideSync`,
      facture, lignes,
      currentPage: 'factures'
    });

  } catch (error) {
    console.error('Erreur affichage facture:', error);
    req.flash('error', 'Erreur lors du chargement de la facture');
    res.redirect('/factures');
  }
};

// ─────────────────────────────────────────────────────────────
// Générer les factures du mois
// → Envoie automatiquement un email à chaque client concerné
// ─────────────────────────────────────────────────────────────
exports.generateMonthly = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const { annee, mois } = req.body;

    // 1. Générer toutes les factures du mois
    const factures = await Facture.generateMonthlyBatch(
      prestataireId,
      parseInt(annee),
      parseInt(mois)
    );

    if (factures.length === 0) {
      req.flash('info', 'Aucune intervention à facturer pour cette période.');
      return res.redirect('/factures');
    }

    // 2. Regrouper les factures par client_id
    const parClient = {};
    for (const f of factures) {
      if (!parClient[f.client_id]) parClient[f.client_id] = [];
      parClient[f.client_id].push(f);
    }

    // 3. Récupérer le prestataire (pour le nom dans l'email)
    const prestataire = await Prestataire.findById(prestataireId);

    // 4. Envoyer un email récapitulatif à chaque client
    let emailsEnvoyes = 0;
    for (const [clientId, facturesClient] of Object.entries(parClient)) {
      const client = await Client.findById(clientId);
      if (client && client.email) {
        const ok = await EmailService.sendNouvellesFacturesEmail(client, facturesClient, prestataire);
        if (ok) emailsEnvoyes++;
      }
    }

    const nbClients = Object.keys(parClient).length;
    req.flash('success',
      `${factures.length} facture(s) générée(s) pour ${nbClients} client(s). ` +
      `${emailsEnvoyes} email(s) envoyé(s).`
    );
    res.redirect('/factures');

  } catch (error) {
    console.error('Erreur génération factures:', error);
    req.flash('error', 'Erreur lors de la génération des factures');
    res.redirect('/factures');
  }
};

// ─────────────────────────────────────────────────────────────
// Marquer une facture comme payée
// → Envoie automatiquement un email de confirmation au client
// ─────────────────────────────────────────────────────────────
exports.markAsPaid = async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    // 1. Mettre à jour le statut en BDD
    await Facture.markAsPaid(factureId, req.body.mode_paiement);

    // 2. Récupérer les infos pour l'email
    const facture     = await Facture.findById(factureId);
    const client      = await Client.findById(facture.client_id);
    const prestataire = await Prestataire.findById(prestataireId);

    // 3. Envoyer la confirmation au client
    if (client && client.email) {
      await EmailService.sendPaiementConfirmeEmail(client, facture, prestataire);
    }

    res.json({ success: true, message: 'Facture marquée comme payée — client notifié par email' });

  } catch (error) {
    console.error('Erreur markAsPaid:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// ─────────────────────────────────────────────────────────────
// Télécharger le PDF
// ─────────────────────────────────────────────────────────────
exports.downloadPDF = async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Facture introuvable');
      return res.redirect('/factures');
    }

    const facture     = await Facture.findById(factureId);
    const lignes      = await Facture.getLines(factureId);
    const prestataire = await Prestataire.findById(prestataireId);
    const client      = await Client.findById(facture.client_id);

    const pdfPath = await PDFService.generateFacturePDF(facture, lignes, prestataire, client);
    await Facture.updatePdfPath(factureId, pdfPath);

    const filepath = path.join(__dirname, '../../public', pdfPath);
    res.download(filepath, `facture-${facture.numero_facture}.pdf`);

  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    req.flash('error', 'Erreur lors de la génération du PDF');
    res.redirect('/factures');
  }
};

// ─────────────────────────────────────────────────────────────
// Envoyer la facture PDF par email (bouton manuel)
// ─────────────────────────────────────────────────────────────
exports.sendEmail = async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    const facture = await Facture.findById(factureId);
    const client  = await Client.findById(facture.client_id);

    if (!client.email) {
      return res.status(400).json({ success: false, message: 'Ce client n\'a pas d\'adresse email' });
    }

    // Générer le PDF si besoin
    let pdfPath = facture.chemin_pdf;
    if (!pdfPath) {
      const lignes      = await Facture.getLines(factureId);
      const prestataire = await Prestataire.findById(prestataireId);
      pdfPath = await PDFService.generateFacturePDF(facture, lignes, prestataire, client);
      await Facture.updatePdfPath(factureId, pdfPath);
    }

    const fullPath = path.join(__dirname, '../../public', pdfPath);
    await EmailService.sendFactureEmail(client, facture, fullPath);

    res.json({ success: true, message: 'Facture envoyée par email' });

  } catch (error) {
    console.error('Erreur envoi email facture:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de l\'envoi de l\'email' });
  }
};
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

    const factures = await Facture.generateMonthlyBatch(
      prestataireId,
      parseInt(annee),
      parseInt(mois)
    );

    if (factures.length === 0) {
      req.flash('info', 'Aucune intervention à facturer pour cette période.');
      return res.redirect('/factures');
    }

    const parClient = {};
    for (const f of factures) {
      if (!parClient[f.client_id]) parClient[f.client_id] = [];
      parClient[f.client_id].push(f);
    }

    const prestataire = await Prestataire.findById(prestataireId);

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

    await Facture.markAsPaid(factureId, req.body.mode_paiement);

    const facture     = await Facture.findById(factureId);
    const client      = await Client.findById(facture.client_id);
    const prestataire = await Prestataire.findById(prestataireId);

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
// Télécharger le PDF (génère sur disque pour le download)
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

    // Génère en mémoire et envoie directement au navigateur
    const pdfBuffer = await PDFService.generateFacturePDFBuffer(facture, lignes, prestataire, client);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="facture-${facture.numero_facture}.pdf"`);
    res.send(pdfBuffer);

  } catch (error) {
    console.error('Erreur téléchargement PDF:', error);
    req.flash('error', 'Erreur lors de la génération du PDF');
    res.redirect('/factures');
  }
};

// ─────────────────────────────────────────────────────────────
// Envoyer la facture PDF par email (bouton manuel)
// → Génère le PDF en mémoire, l'attache et l'envoie via Brevo
// ─────────────────────────────────────────────────────────────
exports.sendEmail = async (req, res) => {
  try {
    const factureId     = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Facture.belongsToPrestataire(factureId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Facture introuvable' });
    }

    const facture     = await Facture.findById(factureId);
    const client      = await Client.findById(facture.client_id);

    if (!client.email) {
      return res.status(400).json({ success: false, message: "Ce client n'a pas d'adresse email" });
    }

    const lignes      = await Facture.getLines(factureId);
    const prestataire = await Prestataire.findById(prestataireId);

    // Génération en mémoire — pas besoin du disque
    const pdfBuffer = await PDFService.generateFacturePDFBuffer(facture, lignes, prestataire, client);

    await EmailService.sendFactureEmail(client, facture, pdfBuffer);

    res.json({ success: true, message: 'Facture envoyée par email' });

  } catch (error) {
    console.error('Erreur envoi email facture:', error);
    res.status(500).json({ success: false, message: "Erreur lors de l'envoi de l'email" });
  }
};
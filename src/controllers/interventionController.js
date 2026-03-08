// ============================================================
// src/controllers/interventionController.js  — VERSION COMPLÈTE
// ============================================================

const Intervention = require('../models/InterventionModel');
const Client       = require('../models/Client');
const TypeService  = require('../models/TypeService');
const Prestataire  = require('../models/Prestataire');
const EmailService = require('../services/emailService');

// ─── Helpers ─────────────────────────────────────────────────
const toLocalDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const j = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${j}`;
};
const isValidDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const isValidTime = (s) => /^\d{2}:\d{2}(:\d{2})?$/.test(s);
const isValidId   = (v) => Number.isInteger(Number(v)) && Number(v) > 0;

// ─────────────────────────────────────────────────────────────
// GET /interventions  →  Planning (vue index)
// ─────────────────────────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;

    if (req.query.start && req.query.end) {
      if (!isValidDate(req.query.start) || !isValidDate(req.query.end)) {
        return res.redirect('/interventions');
      }

      const [sy, sm, sd] = req.query.start.split('-').map(Number);
      const [ey, em, ed] = req.query.end.split('-').map(Number);
      const startOfWeek  = new Date(sy, sm - 1, sd, 0,  0,  0,   0);
      const endOfWeek    = new Date(ey, em - 1, ed, 23, 59, 59, 999);

      const interventions = await Intervention.findByPrestataire(
        prestataireId,
        toLocalDate(startOfWeek),
        toLocalDate(endOfWeek)
      );

      // Semaines précédente et suivante pour la navigation
      const prevS = new Date(startOfWeek); prevS.setDate(prevS.getDate() - 7);
      const prevE = new Date(endOfWeek);   prevE.setDate(prevE.getDate() - 7);
      const nextS = new Date(startOfWeek); nextS.setDate(nextS.getDate() + 7);
      const nextE = new Date(endOfWeek);   nextE.setDate(nextE.getDate() + 7);

      return res.render('pages/interventions/index', {
        title: 'Planning - AideSync',
        interventions,
        startOfWeek,
        endOfWeek,
        prevStart: toLocalDate(prevS),
        prevEnd:   toLocalDate(prevE),
        nextStart: toLocalDate(nextS),
        nextEnd:   toLocalDate(nextE),
        successMsg: req.flash('success')[0] || null,
        errorMsg:   req.flash('error')[0]   || null,
        currentPage: 'planning'
      });
    }

    // Pas de plage → redirect vers la semaine courante (géré côté vue)
    res.render('pages/interventions/redirect', {
      title: 'Planning - AideSync',
      currentPage: 'planning'
    });
  } catch (error) {
    console.error('Erreur planning:', error);
    req.flash('error', 'Erreur lors du chargement du planning');
    res.redirect('/dashboard');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /interventions/create  →  Formulaire de création
// Supporte ?date=YYYY-MM-DD  pour pré-remplir la date depuis le planning
// ─────────────────────────────────────────────────────────────
exports.create = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const clients       = await Client.findByPrestataire(prestataireId);
    const typesService  = await TypeService.findAll();
    const flashData     = req.flash('formData')[0]
      ? JSON.parse(req.flash('formData')[0])
      : {};

    // ── Pré-remplissage date depuis le planning (?date=YYYY-MM-DD) ──
    let preselectedDate = '';
    if (req.query.date && isValidDate(req.query.date)) {
      const qDate = new Date(req.query.date + 'T00:00:00');
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (qDate >= today) preselectedDate = req.query.date; // refuser dates passées
    }

    // ── Validation du client_id passé en query ──
    let preselectedClientId = flashData.client_id || '';
    if (req.query.client_id) {
      if (!isValidId(req.query.client_id)) return res.redirect('/interventions/create');
      preselectedClientId = req.query.client_id;
    }

    res.render('pages/interventions/create', {
      title: 'Nouvelle intervention - AideSync',
      clients,
      typesService,
      errors:   req.flash('error'),
      warnings: req.flash('warning'),
      formData: {
        ...flashData,
        client_id:         preselectedClientId,
        date_intervention: flashData.date_intervention || preselectedDate
      },
      currentPage: 'planning'
    });
  } catch (error) {
    console.error('Erreur formulaire intervention:', error);
    req.flash('error', 'Erreur lors du chargement du formulaire');
    res.redirect('/interventions');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /interventions  →  Enregistrer une intervention
// ─────────────────────────────────────────────────────────────
exports.store = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const { client_id, type_service_id, date_intervention, heure_debut, heure_fin } = req.body;

    // ── Validations basiques ──────────────────────────────────
    if (!isValidId(client_id) || !isValidId(type_service_id)) {
      req.flash('error', 'Données invalides — client ou service manquant.');
      return res.redirect('/interventions/create');
    }
    if (!isValidDate(date_intervention)) {
      req.flash('error', 'La date saisie est invalide.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/interventions/create');
    }
    if (!isValidTime(heure_debut) || !isValidTime(heure_fin)) {
      req.flash('error', 'Les horaires saisis sont invalides.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/interventions/create');
    }
    if (heure_debut >= heure_fin) {
      req.flash('error', "L'heure de fin doit être postérieure à l'heure de début.");
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/interventions/create');
    }

    // ── Vérifier appartenance du client ──────────────────────
    const client = await Client.findById(client_id);
    if (!client || client.prestataire_id !== prestataireId) {
      req.flash('error', 'Client introuvable ou accès non autorisé.');
      return res.redirect('/interventions/create');
    }

    // ── Détection chevauchement (serveur) ────────────────────
    const chevauchement = await Intervention.checkOverlap({
      prestataire_id: prestataireId,
      date_intervention,
      heure_debut,
      heure_fin
    });

    if (chevauchement && !req.body.confirmer_chevauchement) {
      req.flash('warning',
        `⚠️ Chevauchement détecté avec ${chevauchement.client_prenom} ${chevauchement.client_nom} ` +
        `(${chevauchement.heure_debut.slice(0, 5)} – ${chevauchement.heure_fin.slice(0, 5)}). ` +
        `Cochez la case pour forcer la création.`
      );
      req.flash('formData', JSON.stringify({ ...req.body, chevauchement_detecte: '1' }));
      return res.redirect('/interventions/create');
    }

    const notes = req.body.notes_prestataire
      ? String(req.body.notes_prestataire).slice(0, 1000).trim()
      : null;

    // ── Création en BDD ───────────────────────────────────────
    const intervention = await Intervention.create({
      prestataire_id:    prestataireId,
      client_id:         parseInt(client_id),
      type_service_id:   parseInt(type_service_id),
      date_intervention,
      heure_debut,
      heure_fin,
      notes_prestataire: notes
    });

    const typeService = await TypeService.findById(type_service_id);

    // ── Email — respecter la préférence notif_intervention ───
    if (client.email) {
      const prefs = await Prestataire.findById(prestataireId);

      // notif_intervention : true par défaut si la colonne n'existe pas encore
      const sendEmail = (prefs && prefs.notif_intervention !== undefined)
        ? prefs.notif_intervention === true || prefs.notif_intervention === 't'
        : true;

      if (sendEmail) {
        try {
          await EmailService.sendInterventionNotification(client, intervention, typeService);
        } catch (emailErr) {
          // Ne pas bloquer la création si l'email échoue
          console.error('Erreur envoi email intervention:', emailErr.message);
        }
      } else {
        console.log(`[NOTIF] notif_intervention désactivée — email non envoyé (client: ${client.email})`);
      }
    }

    req.flash('success', 'Intervention créée avec succès');
    res.redirect('/interventions');

  } catch (error) {
    console.error('Erreur création intervention:', error);
    req.flash('error', error.message || "Erreur lors de la création de l'intervention");
    req.flash('formData', JSON.stringify(req.body));
    res.redirect('/interventions/create');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /interventions/api/day?date=YYYY-MM-DD
// API interne — liste des interventions du jour (pour détection
// chevauchement en temps réel côté client)
// ─────────────────────────────────────────────────────────────
exports.apiDay = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || !isValidDate(date)) return res.json({ interventions: [] });

    const interventions = await Intervention.findByPrestataire(req.user.id, date, date);

    // Ne renvoyer que les champs nécessaires
    const safe = interventions.map(i => ({
      id:            i.id,
      heure_debut:   i.heure_debut,
      heure_fin:     i.heure_fin,
      client_prenom: i.client_prenom,
      client_nom:    i.client_nom,
      statut:        i.statut
    }));

    res.json({ interventions: safe });
  } catch (error) {
    console.error('Erreur api/day:', error);
    res.json({ interventions: [] });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /interventions/:id/done  →  Marquer effectuée
// ─────────────────────────────────────────────────────────────
exports.markAsDone = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id);
    const prestataireId  = req.user.id;

    if (!isValidId(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const belongs = await Intervention.belongsToPrestataire(interventionId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable' });
    }

    const intervention = await Intervention.findById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable' });
    }
    if (intervention.statut === 'effectuee') {
      return res.status(400).json({ success: false, message: 'Déjà marquée comme effectuée.' });
    }
    if (intervention.statut === 'annulee') {
      return res.status(400).json({ success: false, message: 'Impossible de modifier une intervention annulée.' });
    }

    await Intervention.markAsDone(interventionId);
    res.json({ success: true, message: 'Intervention marquée comme effectuée' });

  } catch (error) {
    console.error('Erreur markAsDone:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /interventions/:id  →  Supprimer (planifiées seulement)
// ─────────────────────────────────────────────────────────────
exports.destroy = async (req, res) => {
  try {
    const interventionId = parseInt(req.params.id);
    const prestataireId  = req.user.id;

    if (!isValidId(interventionId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const belongs = await Intervention.belongsToPrestataire(interventionId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable' });
    }

    const intervention = await Intervention.findById(interventionId);
    if (!intervention) {
      return res.status(404).json({ success: false, message: 'Intervention introuvable' });
    }
    if (intervention.statut === 'effectuee') {
      return res.status(403).json({
        success: false,
        message: 'Impossible de supprimer une intervention déjà effectuée.'
      });
    }

    await Intervention.delete(interventionId);
    req.flash('success', 'Intervention supprimée avec succès');
    res.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression intervention:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
};
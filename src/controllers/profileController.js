// ============================================================
// src/controllers/profileController.js  — VERSION COMPLÈTE
// ============================================================

const bcrypt      = require('bcrypt');
const Prestataire = require('../models/Prestataire');

// ─────────────────────────────────────────────────────────────
// GET /profil
// ─────────────────────────────────────────────────────────────
exports.showProfil = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.user.id);
    if (!prestataire) {
      req.flash('error', 'Profil introuvable');
      return res.redirect('/dashboard');
    }
    res.render('pages/profil/show', {
      title: 'Mon profil - AideSync',
      prestataire,
      success: req.flash('success')[0] || null,
      error:   req.flash('error')[0]   || null,
      currentPage: 'profil'
    });
  } catch (err) {
    console.error('Erreur showProfil:', err);
    req.flash('error', 'Erreur lors du chargement du profil');
    res.redirect('/dashboard');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /profil  →  Mettre à jour les infos personnelles
// ─────────────────────────────────────────────────────────────
exports.updateProfil = async (req, res) => {
  try {
    const { prenom, nom, telephone, adresse, ville, code_postal } = req.body;

    if (!prenom || !nom || !prenom.trim() || !nom.trim()) {
      req.flash('error', 'Le prénom et le nom sont obligatoires');
      return res.redirect('/profil');
    }

    await Prestataire.update(req.user.id, {
      prenom:      prenom.trim().slice(0, 100),
      nom:         nom.trim().slice(0, 100),
      telephone:   telephone   ? telephone.trim().slice(0, 20)   : null,
      adresse:     adresse     ? adresse.trim().slice(0, 255)    : null,
      ville:       ville       ? ville.trim().slice(0, 100)      : null,
      code_postal: code_postal ? code_postal.trim().slice(0, 10) : null
    });

    req.flash('success', 'Profil mis à jour avec succès');
    res.redirect('/profil');
  } catch (err) {
    console.error('Erreur updateProfil:', err);
    req.flash('error', 'Erreur lors de la mise à jour du profil');
    res.redirect('/profil');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /profil/parametres
// ─────────────────────────────────────────────────────────────
exports.showParametres = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.user.id);
    if (!prestataire) {
      req.flash('error', 'Profil introuvable');
      return res.redirect('/dashboard');
    }
    res.render('pages/profil/parametres', {
      title: 'Paramètres - AideSync',
      prestataire,
      success:         req.flash('success')[0]         || null,
      error:           req.flash('error')[0]           || null,
      passwordSuccess: req.flash('passwordSuccess')[0] || null,
      passwordError:   req.flash('passwordError')[0]   || null,
      currentPage: 'parametres'
    });
  } catch (err) {
    console.error('Erreur showParametres:', err);
    req.flash('error', 'Erreur lors du chargement des paramètres');
    res.redirect('/dashboard');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /profil/parametres/password  →  Changer le mot de passe
// ─────────────────────────────────────────────────────────────
exports.updatePassword = async (req, res) => {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
      req.flash('passwordError', 'Tous les champs sont obligatoires');
      return res.redirect('/profil/parametres');
    }
    if (new_password.length < 8) {
      req.flash('passwordError', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return res.redirect('/profil/parametres');
    }
    if (new_password !== confirm_password) {
      req.flash('passwordError', 'Les nouveaux mots de passe ne correspondent pas');
      return res.redirect('/profil/parametres');
    }

    const prestataire = await Prestataire.findByIdWithPassword(req.user.id);
    if (!prestataire) {
      req.flash('passwordError', 'Utilisateur introuvable');
      return res.redirect('/profil/parametres');
    }

    const motDePasseField = prestataire.mot_de_passe || prestataire.password;
    if (!motDePasseField) {
      req.flash('passwordError', 'Impossible de vérifier votre mot de passe actuel');
      return res.redirect('/profil/parametres');
    }

    const isValid = await bcrypt.compare(current_password, motDePasseField);
    if (!isValid) {
      req.flash('passwordError', 'Le mot de passe actuel est incorrect');
      return res.redirect('/profil/parametres');
    }

    const rounds  = parseInt(process.env.BCRYPT_ROUNDS) || 10;
    const newHash = await bcrypt.hash(new_password, rounds);
    await Prestataire.updatePassword(req.user.id, newHash);

    req.flash('passwordSuccess', 'Mot de passe modifié avec succès');
    res.redirect('/profil/parametres');

  } catch (err) {
    console.error('Erreur updatePassword:', err);
    req.flash('passwordError', 'Erreur lors du changement de mot de passe');
    res.redirect('/profil/parametres');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /profil/parametres/notifications  →  Préférences notifs
// ─────────────────────────────────────────────────────────────
exports.updateNotifications = async (req, res) => {
  try {
    const prefs = {
      notif_intervention: req.body.notif_intervention === '1',
      notif_rappel:       req.body.notif_rappel       === '1',
      notif_paiement:     req.body.notif_paiement     === '1',
      notif_retard:       req.body.notif_retard        === '1'
    };

    await Prestataire.updateNotifications(req.user.id, prefs);

    req.flash('success', 'Préférences de notification enregistrées');
    res.redirect('/profil/parametres');
  } catch (err) {
    console.error('Erreur updateNotifications:', err);
    req.flash('error', 'Erreur lors de la mise à jour des préférences');
    res.redirect('/profil/parametres');
  }
};
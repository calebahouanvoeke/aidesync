// ============================================================
// CONTRÔLEUR PROFIL & PARAMÈTRES — avec sauvegarde notifications
// src/controllers/profileController.js
// ============================================================

const Prestataire = require('../models/Prestataire');

exports.show = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.user.id);
    res.render('pages/profil/show', {
      title: 'Mon profil - AideSync',
      prestataire, currentPage: 'profil',
      success: req.flash('success'),
      error:   req.flash('error')
    });
  } catch (error) {
    console.error('Erreur profil:', error);
    req.flash('error', 'Erreur lors du chargement du profil');
    res.redirect('/dashboard');
  }
};

exports.update = async (req, res) => {
  try {
    const { nom, prenom, telephone, siret, adresse, ville, code_postal } = req.body;
    await Prestataire.update(req.user.id, { nom, prenom, telephone, siret, adresse, ville, code_postal });
    req.user.nom    = nom;
    req.user.prenom = prenom;
    req.flash('success', 'Profil mis à jour avec succès');
    res.redirect('/profil');
  } catch (error) {
    console.error('Erreur mise à jour profil:', error);
    req.flash('error', 'Erreur lors de la mise à jour');
    res.redirect('/profil');
  }
};

exports.settings = async (req, res) => {
  try {
    const prestataire = await Prestataire.findById(req.user.id);
    res.render('pages/profil/parametres', {
      title: 'Paramètres - AideSync',
      prestataire, currentPage: 'parametres',
      success: req.flash('success'),
      error:   req.flash('error')
    });
  } catch (error) {
    console.error('Erreur paramètres:', error);
    req.flash('error', 'Erreur lors du chargement des paramètres');
    res.redirect('/dashboard');
  }
};

exports.updatePassword = async (req, res) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe, confirmation_mot_de_passe } = req.body;

    if (!ancien_mot_de_passe || !nouveau_mot_de_passe || !confirmation_mot_de_passe) {
      req.flash('error', 'Tous les champs sont obligatoires');
      return res.redirect('/parametres');
    }
    if (nouveau_mot_de_passe !== confirmation_mot_de_passe) {
      req.flash('error', 'Les nouveaux mots de passe ne correspondent pas');
      return res.redirect('/parametres');
    }
    if (nouveau_mot_de_passe.length < 8) {
      req.flash('error', 'Le nouveau mot de passe doit contenir au moins 8 caractères');
      return res.redirect('/parametres');
    }

    await Prestataire.updatePassword(req.user.id, ancien_mot_de_passe, nouveau_mot_de_passe);
    req.flash('success', 'Mot de passe modifié avec succès');
    res.redirect('/parametres');
  } catch (error) {
    console.error('Erreur changement mot de passe:', error);
    req.flash('error', error.message || 'Erreur lors du changement de mot de passe');
    res.redirect('/parametres');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /parametres/notifications
// Les checkboxes non cochées ne sont PAS envoyées en POST →
// on les considère comme false si absentes du body.
// ─────────────────────────────────────────────────────────────
exports.updateNotifications = async (req, res) => {
  try {
    const prefs = {
      notif_intervention: req.body.notif_intervention === '1',
      notif_rappel:       req.body.notif_rappel       === '1',
      notif_paiement:     req.body.notif_paiement     === '1',
      notif_retard:       req.body.notif_retard       === '1',
    };

    await Prestataire.updateNotifications(req.user.id, prefs);
    req.flash('success', 'Préférences de notifications enregistrées');
    res.redirect('/parametres');
  } catch (error) {
    console.error('Erreur notifications:', error);
    req.flash('error', 'Erreur lors de la sauvegarde des préférences');
    res.redirect('/parametres');
  }
};
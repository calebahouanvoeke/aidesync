// ============================================================
// CONTRÔLEUR D'AUTHENTIFICATION
// ============================================================

const Prestataire = require('../models/Prestataire');
const passport = require('passport');

/**
 * Afficher le formulaire de connexion
 */
exports.showLogin = (req, res) => {
  res.render('pages/auth/login', {
    layout: 'layouts/auth',
    title: 'Connexion - AideSync',
    errors: req.flash('error'),
    success: req.flash('success')
  });
};

/**
 * Traiter la connexion
 */
exports.login = (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/auth/login',
    failureFlash: true
  })(req, res, next);
};

/**
 * Afficher le formulaire d'inscription
 */
exports.showRegister = (req, res) => {
  res.render('pages/auth/register', {
   layout: 'layouts/auth',
    title: 'Inscription - AideSync',
    errors: req.flash('error'),
    formData: req.flash('formData')[0] || {}
  });
};

/**
 * Traiter l'inscription
 */
exports.register = async (req, res) => {
  try {
    const { email, mot_de_passe, nom, prenom, telephone, siret, adresse, ville, code_postal } = req.body;

    // Créer le prestataire
    const prestataire = await Prestataire.create({
      email,
      mot_de_passe,
      nom,
      prenom,
      telephone,
      siret,
      adresse,
      ville,
      code_postal
    });

    // Connecter automatiquement après inscription
    req.login(prestataire, (err) => {
      if (err) {
        console.error('Erreur auto-login:', err);
        req.flash('success', 'Inscription réussie ! Vous pouvez vous connecter.');
        return res.redirect('/auth/login');
      }
      
      req.flash('success', 'Bienvenue sur AideSync !');
      res.redirect('/dashboard');
    });

  } catch (error) {
    console.error('Erreur inscription:', error);
    req.flash('error', error.message || 'Une erreur est survenue lors de l\'inscription');
    res.redirect('/auth/register');
  }
};

/**
 * Déconnexion
 */
exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error('Erreur logout:', err);
    }
    req.flash('success', 'Vous êtes déconnecté');
    res.redirect('/auth/login');
  });
};
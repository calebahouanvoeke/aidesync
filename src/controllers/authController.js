// ============================================================
// CONTRÔLEUR D'AUTHENTIFICATION — Messages d'erreur clairs
// src/controllers/authController.js
// ============================================================

const Prestataire = require('../models/Prestataire');
const passport    = require('passport');

exports.showLogin = (req, res) => {
  res.render('pages/auth/login', {
    layout:  'layouts/auth',
    title:   'Connexion - AideSync',
    errors:  req.flash('error'),
    success: req.flash('success')
  });
};

exports.login = (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // Message d'erreur explicite selon le cas
      let message = 'Email ou mot de passe incorrect';
      if (info && info.message) {
        if (info.message.includes('Password') || info.message.includes('password')) {
          message = 'Mot de passe incorrect. Vérifiez votre saisie.';
        } else if (info.message.includes('user') || info.message.includes('email')) {
          message = 'Aucun compte trouvé avec cet email.';
        } else {
          message = info.message;
        }
      }
      req.flash('error', message);
      return res.redirect('/auth/login');
    }

    // Vérifier que le compte est actif
    if (!user.statut_actif) {
      req.flash('error', 'Votre compte a été désactivé. Contactez le support.');
      return res.redirect('/auth/login');
    }

    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      Prestataire.updateLastLogin(user.id).catch(console.error);

      // Rediriger vers l'URL d'origine si mémorisée
      const returnTo = req.session.returnTo || '/dashboard';
      delete req.session.returnTo;
      res.redirect(returnTo);
    });
  })(req, res, next);
};

exports.showRegister = (req, res) => {
  res.render('pages/auth/register', {
    layout:   'layouts/auth',
    title:    'Inscription - AideSync',
    errors:   req.flash('error'),
    formData: req.flash('formData')[0] || {}
  });
};

exports.register = async (req, res) => {
  try {
    const { email, mot_de_passe, confirm_password, nom, prenom, telephone, siret, adresse, ville, code_postal } = req.body;

    // ── Validations serveur ──────────────────────────────────
    if (!nom || !prenom || !email || !telephone || !mot_de_passe) {
      req.flash('error', 'Veuillez remplir tous les champs obligatoires.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/auth/register');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      req.flash('error', 'L\'adresse email saisie n\'est pas valide.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/auth/register');
    }
    if (mot_de_passe.length < 8) {
      req.flash('error', 'Le mot de passe doit contenir au moins 8 caractères.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/auth/register');
    }
    if (mot_de_passe !== confirm_password) {
      req.flash('error', 'Les mots de passe saisis ne correspondent pas.');
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/auth/register');
    }

    // ── Contrôle doublon email ───────────────────────────────
    const existingUser = await Prestataire.findByEmail(email.toLowerCase().trim());
    if (existingUser) {
      req.flash('error', 'Cette adresse email est déjà utilisée. Essayez de vous connecter.');
      req.flash('formData', JSON.stringify({ ...req.body, email: '' })); // ne pas repopuler l'email
      return res.redirect('/auth/register');
    }

    // ── Création ─────────────────────────────────────────────
    const prestataire = await Prestataire.create({
      email: email.toLowerCase().trim(),
      mot_de_passe, nom, prenom, telephone,
      siret, adresse, ville, code_postal
    });

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
    // Doublon détecté par la BDD (sécurité double)
    if (error.message && error.message.includes('déjà utilisé')) {
      req.flash('error', 'Cette adresse email est déjà utilisée. Essayez de vous connecter.');
    } else {
      req.flash('error', 'Une erreur est survenue lors de l\'inscription. Réessayez.');
    }
    req.flash('formData', JSON.stringify(req.body));
    res.redirect('/auth/register');
  }
};

exports.logout = (req, res) => {
  req.logout((err) => {
    if (err) console.error('Erreur logout:', err);
    req.flash('success', 'Vous avez été déconnecté avec succès.');
    res.redirect('/auth/login');
  });
};
// ============================================================
// MIDDLEWARE AUTH RENFORCÉ — src/middlewares/auth.js
// Remplace le fichier existant
// ============================================================

// ─────────────────────────────────────────────────────────────
// Vérifie que l'utilisateur est connecté
// ─────────────────────────────────────────────────────────────
exports.isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    // Régénérer l'ID de session périodiquement (anti-fixation)
    if (!req.session.lastRegen || Date.now() - req.session.lastRegen > 30 * 60 * 1000) {
      const userData = req.user;
      req.session.regenerate((err) => {
        if (err) {
          console.error('Erreur régénération session:', err);
          return next();
        }
        req.session.lastRegen = Date.now();
        req.session.passport  = { user: userData.id };
        next();
      });
      return;
    }
    return next();
  }

  // Mémoriser l'URL demandée pour redirection post-login
  if (req.method === 'GET') {
    req.session.returnTo = req.originalUrl;
  }

  if (req.xhr || req.headers.accept?.includes('application/json')) {
    return res.status(401).json({ success: false, message: 'Non authentifié' });
  }

  req.flash('error', 'Veuillez vous connecter pour accéder à cette page');
  res.redirect('/auth/login');
};

// ─────────────────────────────────────────────────────────────
// Vérifie que l'utilisateur N'est PAS connecté (pages login/register)
// ─────────────────────────────────────────────────────────────
exports.isGuest = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.redirect('/dashboard');
  }
  next();
};

// ─────────────────────────────────────────────────────────────
// Vérifie que le compte est actif
// ─────────────────────────────────────────────────────────────
exports.isActive = (req, res, next) => {
  if (!req.user || req.user.statut_actif === false) {
    req.logout?.(() => {});
    req.flash('error', 'Votre compte a été désactivé. Contactez le support.');
    return res.redirect('/auth/login');
  }
  next();
};
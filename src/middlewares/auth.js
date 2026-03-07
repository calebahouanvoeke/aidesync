// ============================================================
// MIDDLEWARE D'AUTHENTIFICATION
// ============================================================

/**
 * Vérifier que l'utilisateur est connecté
 */
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Vous devez être connecté pour accéder à cette page');
  res.redirect('/auth/login');
}

/**
 * Vérifier que l'utilisateur n'est PAS connecté (pour login/register)
 */
function isGuest(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
}

/**
 * Vérifier qu'une ressource appartient bien au prestataire connecté
 */
function checkOwnership(Model, paramName = 'id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramName];
      const prestataireId = req.user.id;

      const belongs = await Model.belongsToPrestataire(resourceId, prestataireId);
      
      if (!belongs) {
        req.flash('error', 'Accès non autorisé');
        return res.redirect('/dashboard');
      }

      next();
    } catch (error) {
      console.error('Erreur checkOwnership:', error);
      req.flash('error', 'Une erreur est survenue');
      res.redirect('/dashboard');
    }
  };
}

module.exports = {
  isAuthenticated,
  isGuest,
  checkOwnership
};
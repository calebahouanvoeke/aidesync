// ============================================================
// CONFIGURATION PASSPORT - AUTHENTIFICATION
// ============================================================

const LocalStrategy = require('passport-local').Strategy;
const Prestataire = require('../models/Prestataire');

module.exports = function(passport) {
  
  // ============================================================
  // STRATÉGIE LOCAL (Email + Mot de passe)
  // ============================================================
  
  passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'mot_de_passe'
  },
  async (email, mot_de_passe, done) => {
    try {
      // Rechercher le prestataire par email
      const prestataire = await Prestataire.findByEmail(email);
      
      if (!prestataire) {
        return done(null, false, { message: 'Email ou mot de passe incorrect' });
      }

      // Vérifier si le compte est actif
      if (!prestataire.statut_actif) {
        return done(null, false, { message: 'Compte désactivé' });
      }

      // Vérifier le mot de passe
      const isValid = await Prestataire.verifyPassword(mot_de_passe, prestataire.mot_de_passe);
      
      if (!isValid) {
        return done(null, false, { message: 'Email ou mot de passe incorrect' });
      }

      // Mettre à jour la dernière connexion
      await Prestataire.updateLastLogin(prestataire.id);

      // Authentification réussie
      return done(null, prestataire);
      
    } catch (error) {
      console.error('Erreur authentification:', error);
      return done(error);
    }
  }));

  // ============================================================
  // SÉRIALISATION (Stocker l'ID en session)
  // ============================================================
  
  passport.serializeUser((prestataire, done) => {
    done(null, prestataire.id);
  });

  // ============================================================
  // DÉSÉRIALISATION (Récupérer l'utilisateur depuis l'ID)
  // ============================================================
  
  passport.deserializeUser(async (id, done) => {
    try {
      const prestataire = await Prestataire.findById(id);
      
      if (!prestataire) {
        return done(null, false);
      }

      // Ne pas renvoyer le mot de passe dans la session
      delete prestataire.mot_de_passe;
      
      done(null, prestataire);
    } catch (error) {
      console.error('Erreur deserializeUser:', error);
      done(error);
    }
  });
};
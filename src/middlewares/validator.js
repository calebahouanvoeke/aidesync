// ============================================================
// MIDDLEWARE DE VALIDATION DES DONNÉES
// ============================================================

const { body, validationResult } = require('express-validator');

/**
 * Règles de validation pour l'inscription
 */
const registerValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('mot_de_passe')
    .isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  
  body('confirm_password')
    .custom((value, { req }) => value === req.body.mot_de_passe)
    .withMessage('Les mots de passe ne correspondent pas'),
  
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 100 }).withMessage('Le nom est trop long'),
  
  body('prenom')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ max: 100 }).withMessage('Le prénom est trop long'),
  
  body('telephone')
    .trim()
    .notEmpty().withMessage('Le téléphone est requis')
    .matches(/^[0-9\s\-\+\(\)\.]+$/).withMessage('Téléphone invalide')
];

/**
 * Règles de validation pour la connexion
 */
const loginValidation = [
  body('email')
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('mot_de_passe')
    .notEmpty().withMessage('Le mot de passe est requis')
];

/**
 * Règles de validation pour un client
 */
const clientValidation = [
  body('nom')
    .trim()
    .notEmpty().withMessage('Le nom est requis')
    .isLength({ max: 100 }).withMessage('Le nom est trop long'),
  
  body('prenom')
    .trim()
    .notEmpty().withMessage('Le prénom est requis')
    .isLength({ max: 100 }).withMessage('Le prénom est trop long'),
  
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Email invalide')
    .normalizeEmail(),
  
  body('telephone')
    .trim()
    .notEmpty().withMessage('Le téléphone est requis')
    .matches(/^[0-9\s\-\+\(\)\.]+$/).withMessage('Téléphone invalide'),
  
  body('adresse')
    .trim()
    .notEmpty().withMessage('L\'adresse est requise'),
  
  body('ville')
    .trim()
    .notEmpty().withMessage('La ville est requise'),
  
  body('code_postal')
    .trim()
    .notEmpty().withMessage('Le code postal est requis')
    .matches(/^[0-9]{5}$/).withMessage('Code postal invalide (5 chiffres)')
];

/**
 * Règles de validation pour une intervention
 */
const interventionValidation = [
  body('client_id')
    .notEmpty().withMessage('Le client est requis')
    .isInt().withMessage('Client invalide'),
  
  body('type_service_id')
    .notEmpty().withMessage('Le type de service est requis')
    .isInt().withMessage('Type de service invalide'),
  
  body('date_intervention')
    .notEmpty().withMessage('La date est requise')
    .isDate().withMessage('Date invalide'),
  
  body('heure_debut')
    .notEmpty().withMessage('L\'heure de début est requise')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de début invalide'),
  
  body('heure_fin')
    .notEmpty().withMessage('L\'heure de fin est requise')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Heure de fin invalide')
    .custom((value, { req }) => {
      if (value <= req.body.heure_debut) {
        throw new Error('L\'heure de fin doit être après l\'heure de début');
      }
      return true;
    })
];

/**
 * Middleware pour vérifier les erreurs de validation
 */
function checkValidation(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Stocker les erreurs dans flash
    errors.array().forEach(error => {
      req.flash('error', error.msg);
    });
    
    // Stocker les anciennes valeurs pour repeupler le formulaire
    req.flash('formData', JSON.stringify(req.body));
    
    // Rediriger vers la page précédente
    return res.redirect('back');
  }
  
  next();
}

module.exports = {
  registerValidation,
  loginValidation,
  clientValidation,
  interventionValidation,
  checkValidation
};
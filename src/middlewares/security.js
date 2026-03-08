// ============================================================
// MIDDLEWARES DE SÉCURITÉ — src/middlewares/security.js
// ============================================================

const rateLimit = require('express-rate-limit');

// ─────────────────────────────────────────────────────────────
// Rate limiting — Login : 10 tentatives / 15 min par IP
// ─────────────────────────────────────────────────────────────
exports.loginLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  skipSuccessfulRequests: true,
  message: {
    error: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.'
  },
  handler: (req, res) => {
    req.flash('error', 'Trop de tentatives de connexion. Réessayez dans 15 minutes.');
    res.redirect('/auth/login');
  }
});

// ─────────────────────────────────────────────────────────────
// Rate limiting — API générale : 200 req / 15 min par IP
// ─────────────────────────────────────────────────────────────
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' }
});

// ─────────────────────────────────────────────────────────────
// Rate limiting — Création de ressources : 30 req / 10 min
// ─────────────────────────────────────────────────────────────
exports.createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de créations en peu de temps.' }
});

// ─────────────────────────────────────────────────────────────
// Rate limiting — Email : 20 envois / heure
// ─────────────────────────────────────────────────────────────
exports.emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Limite d\'envoi d\'emails atteinte.' }
});

// ─────────────────────────────────────────────────────────────
// Sanitize — Nettoyer les entrées texte (XSS basique)
// ─────────────────────────────────────────────────────────────
exports.sanitizeInput = (req, res, next) => {
  const sanitize = (val) => {
    if (typeof val !== 'string') return val;
    return val
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '')
      .trim();
  };

  const sanitizeObj = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitize(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeObj(obj[key]);
      }
    }
    return obj;
  };

  sanitizeObj(req.body);
  sanitizeObj(req.query);
  next();
};

// ─────────────────────────────────────────────────────────────
// Vérifier que l'ID en param est un entier positif
// ─────────────────────────────────────────────────────────────
exports.validateParamId = (req, res, next) => {
  const id = req.params.id;
  if (!id || !/^\d+$/.test(id) || parseInt(id) <= 0) {
    if (req.xhr || req.headers.accept?.includes('application/json')) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }
    req.flash('error', 'Ressource introuvable');
    return res.redirect('back');
  }
  next();
};

// ─────────────────────────────────────────────────────────────
// Logger sécurité — loguer les accès suspects
// ─────────────────────────────────────────────────────────────
exports.securityLogger = (req, res, next) => {
  const suspicious = [
    '../', '..\\', '<script', 'javascript:', 'SELECT ', 'DROP ', 'INSERT ',
    'UNION ', '--', ';--', '/*', '*/', 'exec(', 'eval('
  ];
  const fullUrl = req.originalUrl + JSON.stringify(req.body || {});
  const found   = suspicious.some(s => fullUrl.toLowerCase().includes(s.toLowerCase()));

  if (found) {
    console.warn(`⚠️ [SECURITY] Requête suspecte — IP: ${req.ip} | URL: ${req.originalUrl} | User: ${req.user?.id || 'anonymous'}`);
  }
  next();
};
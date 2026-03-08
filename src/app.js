// ============================================================
// AIDESYNC - APPLICATION PRINCIPALE
// ============================================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const passport = require('passport');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const flash = require('express-flash');
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const { apiLimiter, sanitizeInput, securityLogger } = require('./middlewares/security');
const profilRoutes = require('./routes/profil');
const { pool } = require('./config/database');
const expressLayouts = require('express-ejs-layouts');

require('./config/passport')(passport);

const app  = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// MIDDLEWARES
// ============================================================

// ── Helmet sans CSP en développement, CSP souple en production ──
if (process.env.NODE_ENV === 'production') {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'", "'unsafe-inline'", "'unsafe-eval'",
                         "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com",
                         "https://cdn.sweetalert2.com"],
        scriptSrcAttr:  ["'unsafe-inline'"],   // ← autorise onclick= etc.
        styleSrc:       ["'self'", "'unsafe-inline'",
                         "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com",
                         "https://cdn.sweetalert2.com"],
        fontSrc:        ["'self'", "https://cdnjs.cloudflare.com", "data:"],
        imgSrc:         ["'self'", "data:", "https:"],
        connectSrc:     ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        frameSrc:       ["'none'"],
        objectSrc:      ["'none'"],
      }
    },
    crossOriginEmbedderPolicy: false,
  }));
} else {
  // En développement : helmet sans CSP du tout — aucun blocage
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
}

app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// SESSIONS
// ============================================================

app.set('trust proxy', 1);
app.use(sanitizeInput);
app.use(securityLogger);
app.use('/api', apiLimiter);

app.use(session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge:   30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

app.use(flash());

// ============================================================
// PASSPORT
// ============================================================

app.use(passport.initialize());
app.use(passport.session());

const unreadMessages = require('./middlewares/unreadMessages');
app.use(unreadMessages);

// ============================================================
// MOTEUR DE TEMPLATES EJS
// ============================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use((req, res, next) => {
  res.locals.user        = req.user || null;
  res.locals.success     = req.flash('success');
  res.locals.error       = req.flash('error');
  res.locals.currentPath = req.path;
  res.locals.currentPage = '';
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Silencer la requête automatique de Chrome DevTools
app.get('/.well-known/appspecific/com.chrome.devtools.json', (req, res) => res.status(204).end());

app.use('/',              require('./routes/index'));
app.use('/auth',          require('./routes/auth'));
app.use('/dashboard',     require('./routes/dashboard'));
app.use('/profil',        profilRoutes);
app.use('/clients',       require('./routes/clients'));
app.use('/interventions', require('./routes/interventions'));
app.use('/factures',      require('./routes/factures'));
app.use('/messages',      require('./routes/messages'));
app.use('/client',        require('./routes/clientPortal'));

// ============================================================
// GESTION DES ERREURS
// ============================================================

const { notFound, errorHandler } = require('./middlewares/errorHandler');
app.use(notFound);
app.use(errorHandler);

// ============================================================
// TÂCHES PLANIFIÉES
// ============================================================

const cron = require('node-cron');
const { dailyTasks } = require('./scripts/cron');

cron.schedule('0 8 * * *', () => {
  console.log('⏰ Déclenchement des tâches quotidiennes...');
  dailyTasks();
});
console.log('✅ Tâches planifiées configurées (tous les jours à 8h00)');

// ============================================================
// DÉMARRAGE
// ============================================================

app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  🚀 AIDESYNC DÉMARRÉ');
  console.log('========================================');
  console.log(`  Port: ${PORT}`);
  console.log(`  URL:  http://localhost:${PORT}`);
  console.log(`  Env:  ${process.env.NODE_ENV || 'development'}`);
  console.log('========================================');
  console.log('');
});

process.on('SIGINT', () => {
  pool.end(() => {
    console.log('\nServeur arrêté');
    process.exit(0);
  });
});

module.exports = app;
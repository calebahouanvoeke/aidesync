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



const { pool } = require('./config/database');
const expressLayouts = require('express-ejs-layouts');

// Charger la configuration Passport
require('./config/passport')(passport);

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CONFIGURATION DES MIDDLEWARES
// ============================================================

// Sécurité avec Helmet
app.use(helmet({ contentSecurityPolicy: false }));



// Compression des réponses
app.use(compression());

// Logger les requêtes HTTP (en développement uniquement)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Parser le corps des requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookies
app.use(cookieParser());

// Méthodes HTTP additionnelles (PUT, DELETE)
app.use(methodOverride('_method'));

// Fichiers statiques
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================
// CONFIGURATION DES SESSIONS
// ============================================================

app.set('trust proxy', 1);

app.use(session({
  store: new pgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Flash messages
app.use(flash());

// ============================================================
// CONFIGURATION DE PASSPORT (Authentification)
// ============================================================

app.use(passport.initialize());
app.use(passport.session());
// En haut du fichier avec les autres require :
const unreadMessages = require('./middlewares/unreadMessages');

// Juste après app.use(passport.session()) :
app.use(unreadMessages);

// ============================================================
// CONFIGURATION DU MOTEUR DE TEMPLATES (EJS)
// ============================================================

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main'); 

// Variables globales pour toutes les vues
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.currentPath = req.path;
  res.locals.currentPage = ''; 
  next();
});

// ============================================================
// ROUTES
// ============================================================

// Routes principales
app.use('/', require('./routes/index'));

// Routes d'authentification
app.use('/auth', require('./routes/auth'));

// Routes du tableau de bord
app.use('/dashboard', require('./routes/dashboard'));

// Routes clients
app.use('/clients', require('./routes/clients'));

// Routes interventions
app.use('/interventions', require('./routes/interventions'));

// Routes factures
app.use('/factures', require('./routes/factures'));

// Routes messages
app.use('/messages', require('./routes/messages'));

// Routes portail client (AVANT les middlewares d'erreur)
app.use('/client', require('./routes/clientPortal'));
// ============================================================
// GESTION DES ERREURS
// ============================================================

const { notFound, errorHandler } = require('./middlewares/errorHandler');

// Route non trouvée (404)
app.use(notFound);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ============================================================
// DÉMARRAGE DU SERVEUR
// ============================================================

// ============================================================
// TÂCHES PLANIFIÉES
// ============================================================

const cron = require('node-cron');
const { dailyTasks } = require('./scripts/cron');

// Exécuter les tâches quotidiennes tous les jours à 8h00
cron.schedule('0 8 * * *', () => {
  console.log('⏰ Déclenchement des tâches quotidiennes automatiques...');
  dailyTasks();
});

console.log('✅ Tâches planifiées configurées (tous les jours à 8h00)');



app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log('  🚀 AIDESYNC DÉMARRÉ');
  console.log('========================================');
  console.log('  Port: ' + PORT);
  console.log('  URL:  http://localhost:' + PORT);
  console.log('========================================');
  console.log('');
});

// Gestion propre de l'arrêt du serveur
process.on('SIGINT', () => {
  pool.end(() => {
    console.log('\nServeur arrêté');
    process.exit(0);
  });
});

module.exports = app;

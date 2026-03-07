// ============================================================
// MIDDLEWARE DE GESTION DES ERREURS
// ============================================================

/**
 * Middleware pour les routes non trouvées (404)
 */
function notFound(req, res, next) {
  const error = new Error(`Page non trouvée - ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

/**
 * Gestionnaire d'erreurs global
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  
  // Logger l'erreur en développement
  if (process.env.NODE_ENV === 'development') {
    console.error('Erreur:', err);
  }

  // Vérifier si c'est une requête AJAX
  const isAjax = req.xhr || (req.headers.accept && req.headers.accept.indexOf('json') > -1);

  if (isAjax) {
    return res.status(statusCode).json({
      success: false,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Sinon, afficher une page d'erreur
  res.status(statusCode);
  
  // Si c'est une 404
  if (statusCode === 404) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>404 - Page non trouvée</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background: #f5f5f5;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
          }
          .container {
            text-align: center;
            background: white;
            padding: 3rem;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          h1 { font-size: 6rem; color: #e74c3c; margin: 0; }
          h2 { color: #555; margin: 1rem 0; }
          a {
            display: inline-block;
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            background: #3498db;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            transition: background 0.3s;
          }
          a:hover { background: #2980b9; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>404</h1>
          <h2>Page non trouvée</h2>
          <p>La page que vous recherchez n'existe pas.</p>
          <a href="/dashboard">Retour au tableau de bord</a>
        </div>
      </body>
      </html>
    `);
  }

  // Pour les autres erreurs
  res.send(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Erreur - AideSync</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          background: #f5f5f5;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          margin: 0;
        }
        .container {
          text-align: center;
          background: white;
          padding: 3rem;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 600px;
        }
        h1 { color: #e74c3c; }
        .error-code { font-size: 4rem; font-weight: bold; color: #e74c3c; margin: 0; }
        .error-message { color: #555; margin: 1rem 0; }
        pre {
          background: #f8f9fa;
          padding: 1rem;
          border-radius: 5px;
          text-align: left;
          overflow-x: auto;
        }
        a {
          display: inline-block;
          margin-top: 1rem;
          padding: 0.75rem 1.5rem;
          background: #3498db;
          color: white;
          text-decoration: none;
          border-radius: 5px;
        }
        a:hover { background: #2980b9; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="error-code">${statusCode}</div>
        <h1>⚠️ Une erreur est survenue</h1>
        <div class="error-message">${err.message}</div>
        ${process.env.NODE_ENV === 'development' ? `<pre>${err.stack}</pre>` : ''}
        <a href="/dashboard">Retour au tableau de bord</a>
      </div>
    </body>
    </html>
  `);
}

module.exports = {
  notFound,
  errorHandler
};
// ============================================================
// src/controllers/clientController.js  — VERSION COMPLÈTE
// Validation robuste + retours utilisateur clairs
// ============================================================

const Client = require('../models/Client');

// ─── Helpers validation ───────────────────────────────────────
const trim = (v) => (v ? String(v).trim() : '');

// Interdit les caractères spéciaux en début/fin et les espaces en début/fin
// Autorise les lettres (accents inclus), chiffres, espaces internes, tirets, apostrophes
const isCleanText = (v) => /^[^\s!@#$%^&*()_+=\[\]{};':"\\|,.<>/?`~].*[^\s!@#$%^&*()_+=\[\]{};':"\\|,.<>/?`~]$/.test(v) || v.length === 1;
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const isValidPhone = (v) => /^(\+33|0)[1-9][\s.\-]?(\d{2}[\s.\-]?){4}$/.test(v.replace(/\s/g, ''));
const isValidCP    = (v) => /^[0-9]{5}$/.test(v);

// Valider un champ texte : trim, pas d'espace début/fin, pas de special char début/fin
function validateTextField(value, fieldName, required = true, maxLen = 100) {
  const v = trim(value);
  if (!v) {
    return required ? `Le champ "${fieldName}" est obligatoire.` : null;
  }
  if (v !== value && value) {
    // des espaces en début ou fin
    return `Le champ "${fieldName}" ne doit pas commencer ou finir par un espace.`;
  }
  if (v.length < 2) {
    return `Le champ "${fieldName}" doit contenir au moins 2 caractères.`;
  }
  if (v.length > maxLen) {
    return `Le champ "${fieldName}" ne doit pas dépasser ${maxLen} caractères.`;
  }
  // Pas de caractère spécial en début ou en fin
  if (/^[\s\W]|[\s\W]$/.test(v)) {
    return `Le champ "${fieldName}" ne doit pas commencer ou finir par un caractère spécial.`;
  }
  return null;
}

// Construire les erreurs de validation complètes
function validateClientData(body, isEdit = false) {
  const errors = [];

  // Nom
  const nomErr = validateTextField(body.nom, 'Nom', true, 100);
  if (nomErr) errors.push(nomErr);

  // Prénom
  const prenomErr = validateTextField(body.prenom, 'Prénom', true, 100);
  if (prenomErr) errors.push(prenomErr);

  // Email (optionnel mais validé si fourni)
  const emailVal = trim(body.email);
  if (emailVal) {
    if (emailVal !== body.email) {
      errors.push('L\'email ne doit pas commencer ou finir par un espace.');
    } else if (!isValidEmail(emailVal)) {
      errors.push('L\'adresse email n\'est pas valide.');
    }
  }

  // Téléphone
  const telVal = trim(body.telephone);
  if (!telVal) {
    errors.push('Le téléphone est obligatoire.');
  } else if (telVal !== body.telephone) {
    errors.push('Le téléphone ne doit pas commencer ou finir par un espace.');
  } else if (!isValidPhone(telVal)) {
    errors.push('Le numéro de téléphone n\'est pas valide (format français attendu).');
  }

  // Adresse
  const adresseErr = validateTextField(body.adresse, 'Adresse', true, 255);
  if (adresseErr) errors.push(adresseErr);

  // Ville
  const villeErr = validateTextField(body.ville, 'Ville', true, 100);
  if (villeErr) errors.push(villeErr);

  // Code postal
  const cpVal = trim(body.code_postal);
  if (!cpVal) {
    errors.push('Le code postal est obligatoire.');
  } else if (!isValidCP(cpVal)) {
    errors.push('Le code postal doit contenir exactement 5 chiffres.');
  }

  // Code accès (optionnel)
  if (body.code_acces && body.code_acces !== trim(body.code_acces)) {
    errors.push('Le code d\'accès ne doit pas commencer ou finir par un espace.');
  }

  // Notes (optionnel, max 500)
  if (body.informations_complementaires && trim(body.informations_complementaires).length > 500) {
    errors.push('Les notes ne doivent pas dépasser 500 caractères.');
  }

  return errors;
}

// Nettoyer les données avant insertion
function sanitizeClientData(body) {
  return {
    nom:                       trim(body.nom),
    prenom:                    trim(body.prenom),
    email:                     trim(body.email)   || null,
    telephone:                 trim(body.telephone),
    adresse:                   trim(body.adresse),
    ville:                     trim(body.ville),
    code_postal:               trim(body.code_postal),
    code_acces:                trim(body.code_acces)  || null,
    informations_complementaires: trim(body.informations_complementaires) || null
  };
}

// ─────────────────────────────────────────────────────────────
// GET /clients
// ─────────────────────────────────────────────────────────────
exports.index = async (req, res) => {
  try {
    const clients = await Client.findByPrestataire(req.user.id);
    res.render('pages/clients/index', {
      title: 'Mes clients - AideSync',
      clients,
      success: req.flash('success')[0] || null,
      error:   req.flash('error')[0]   || null,
      currentPage: 'clients'
    });
  } catch (error) {
    console.error('Erreur liste clients:', error);
    req.flash('error', 'Erreur lors du chargement des clients');
    res.redirect('/dashboard');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /clients/new  →  Formulaire création
// ─────────────────────────────────────────────────────────────
exports.create = (req, res) => {
  // Récupérer les données du flash (retour après erreur)
  const rawFormData = req.flash('formData')[0];
  const formData    = rawFormData ? JSON.parse(rawFormData) : {};

  res.render('pages/clients/clients-form', {
    title: 'Nouveau client - AideSync',
    isEdit:   false,
    client:   null,
    formData,
    errors:   req.flash('error'),
    currentPage: 'clients'
  });
};

// ─────────────────────────────────────────────────────────────
// POST /clients  →  Enregistrer un nouveau client
// ─────────────────────────────────────────────────────────────
exports.store = async (req, res) => {
  try {
    const prestataireId = req.user.id;

    // ── Validation ───────────────────────────────────────────
    const validationErrors = validateClientData(req.body);
    if (validationErrors.length > 0) {
      validationErrors.forEach(e => req.flash('error', e));
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect('/clients/new');
    }

    const data = sanitizeClientData(req.body);

    // ── Vérifier unicité email (parmi les clients de ce prestataire) ──
    if (data.email) {
      const emailExists = await Client.emailExistsForPrestataire(data.email, prestataireId);
      if (emailExists) {
        req.flash('error', `L'adresse email "${data.email}" est déjà utilisée par un autre client.`);
        req.flash('formData', JSON.stringify(req.body));
        return res.redirect('/clients/new');
      }
    }

    const client = await Client.create(prestataireId, data);

    req.flash('success', `Client ${client.prenom} ${client.nom} créé avec succès.`);
    res.redirect(`/clients/${client.id}`);

  } catch (error) {
    console.error('Erreur création client:', error);
    req.flash('error', 'Une erreur est survenue lors de la création du client. Veuillez réessayer.');
    req.flash('formData', JSON.stringify(req.body));
    res.redirect('/clients/new');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /clients/:id  →  Fiche client
// ─────────────────────────────────────────────────────────────
exports.show = async (req, res) => {
  try {
    const clientId      = parseInt(req.params.id);
    const prestataireId = req.user.id;

    if (!clientId || isNaN(clientId)) {
      req.flash('error', 'Identifiant client invalide.');
      return res.redirect('/clients');
    }

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Ce client est introuvable ou n\'appartient pas à votre compte.');
      return res.redirect('/clients');
    }

    const [client, history, stats] = await Promise.all([
      Client.findById(clientId),
      Client.getHistory(clientId),
      Client.getStatistics(clientId)
    ]);

    const baseUrl        = `${req.protocol}://${req.get('host')}`;
    const lienAccesClient = `${baseUrl}/client/${client.lien_acces_securise}`;

    res.render('pages/clients/show', {
      title: `${client.prenom} ${client.nom} - AideSync`,
      client,
      history,
      stats,
      lienAccesClient,
      success: req.flash('success')[0] || null,
      error:   req.flash('error')[0]   || null,
      currentPage: 'clients'
    });

  } catch (error) {
    console.error('Erreur affichage client:', error);
    req.flash('error', 'Erreur lors du chargement de la fiche client.');
    res.redirect('/clients');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /clients/:id/edit  →  Formulaire édition
// ─────────────────────────────────────────────────────────────
exports.edit = async (req, res) => {
  try {
    const clientId      = parseInt(req.params.id);
    const prestataireId = req.user.id;

    if (!clientId || isNaN(clientId)) {
      req.flash('error', 'Identifiant client invalide.');
      return res.redirect('/clients');
    }

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Ce client est introuvable ou n\'appartient pas à votre compte.');
      return res.redirect('/clients');
    }

    const client = await Client.findById(clientId);

    // Récupérer données flash si retour après erreur de validation
    const rawFormData = req.flash('formData')[0];
    const formData    = rawFormData ? JSON.parse(rawFormData) : {};

    res.render('pages/clients/clients-form', {
      title: `Modifier ${client.prenom} ${client.nom} - AideSync`,
      isEdit:   true,
      client,
      formData,                        // données flash prioritaires sur client
      errors:   req.flash('error'),
      currentPage: 'clients'
    });

  } catch (error) {
    console.error('Erreur formulaire édition client:', error);
    req.flash('error', 'Erreur lors du chargement du formulaire.');
    res.redirect('/clients');
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /clients/:id  →  Mettre à jour un client
// ─────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const clientId      = parseInt(req.params.id);
    const prestataireId = req.user.id;

    if (!clientId || isNaN(clientId)) {
      req.flash('error', 'Identifiant client invalide.');
      return res.redirect('/clients');
    }

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Ce client est introuvable ou n\'appartient pas à votre compte.');
      return res.redirect('/clients');
    }

    // ── Validation ───────────────────────────────────────────
    const validationErrors = validateClientData(req.body, true);
    if (validationErrors.length > 0) {
      validationErrors.forEach(e => req.flash('error', e));
      req.flash('formData', JSON.stringify(req.body));
      return res.redirect(`/clients/${clientId}/edit`);
    }

    const data = sanitizeClientData(req.body);

    // ── Vérifier unicité email (exclure le client courant) ──
    if (data.email) {
      const emailExists = await Client.emailExistsForPrestataire(data.email, prestataireId, clientId);
      if (emailExists) {
        req.flash('error', `L'adresse email "${data.email}" est déjà utilisée par un autre client.`);
        req.flash('formData', JSON.stringify(req.body));
        return res.redirect(`/clients/${clientId}/edit`);
      }
    }

    await Client.update(clientId, data);

    req.flash('success', 'Fiche client mise à jour avec succès.');
    res.redirect(`/clients/${clientId}`);

  } catch (error) {
    console.error('Erreur modification client:', error);
    req.flash('error', 'Une erreur est survenue lors de la modification. Veuillez réessayer.');
    req.flash('formData', JSON.stringify(req.body));
    res.redirect(`/clients/${req.params.id}/edit`);
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /clients/:id  →  Désactiver un client
// ─────────────────────────────────────────────────────────────
exports.destroy = async (req, res) => {
  try {
    const clientId      = parseInt(req.params.id);
    const prestataireId = req.user.id;

    if (!clientId || isNaN(clientId)) {
      return res.status(400).json({ success: false, message: 'Identifiant client invalide.' });
    }

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Client introuvable.' });
    }

    await Client.delete(clientId);

    req.flash('success', 'Client supprimé avec succès.');
    res.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression client:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression du client.' });
  }
};
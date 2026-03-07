// ============================================================
// CONTRÔLEUR CLIENTS
// ============================================================

const Client = require('../models/Client');

/**
 * Liste des clients
 */
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const clients = await Client.findByPrestataire(prestataireId);

    res.render('pages/clients/index', {
      title: 'Mes clients - AideSync',
      clients,
      currentPage: 'clients'
    });

  } catch (error) {
    console.error('Erreur liste clients:', error);
    req.flash('error', 'Erreur lors du chargement des clients');
    res.redirect('/dashboard');
  }
};

/**
 * Afficher le formulaire de création
 */
exports.create = (req, res) => {
  res.render('pages/clients/clients-form', {
    title: 'Nouveau client - AideSync',
    errors: req.flash('error'),
    formData: req.flash('formData')[0] || {},
    currentPage: 'clients'
  });
};

/**
 * Enregistrer un nouveau client
 */
exports.store = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    
    const client = await Client.create(prestataireId, {
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      telephone: req.body.telephone,
      adresse: req.body.adresse,
      ville: req.body.ville,
      code_postal: req.body.code_postal,
      code_acces: req.body.code_acces,
      informations_complementaires: req.body.informations_complementaires
    });

    req.flash('success', 'Client ajouté avec succès');
    res.redirect(`/clients/${client.id}`);

  } catch (error) {
    console.error('Erreur création client:', error);
    req.flash('error', error.message || 'Erreur lors de la création du client');
    req.flash('formData', JSON.stringify(req.body));
    res.redirect('/clients/clients-form');
  }
};


// ============================================================
// Remplace exports.show ET exports.edit dans clientController.js
// ============================================================

exports.show = async (req, res) => {
  try {
    const clientId = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Client introuvable');
      return res.redirect('/clients');
    }

    const client = await Client.findById(clientId);
    const history = await Client.getHistory(clientId);
    const stats   = await Client.getStatistics(clientId);

    // ── Construire le lien côté serveur (seul endroit fiable) ──
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const lienAccesClient = `${baseUrl}/client/${client.lien_acces_securise}`;

    res.render('pages/clients/show', {
      title: `${client.prenom} ${client.nom} - AideSync`,
      client,
      history,
      stats,
      lienAccesClient,   // ← passé à la vue
      currentPage: 'clients'
    });

  } catch (error) {
    console.error('Erreur affichage client:', error);
    req.flash('error', 'Erreur lors du chargement du client');
    res.redirect('/clients');
  }
};

exports.edit = async (req, res) => {
  try {
    const clientId = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Client introuvable');
      return res.redirect('/clients');
    }

    const client = await Client.findById(clientId);

    res.render('pages/clients/clients-form', {
      title: `Modifier ${client.prenom} ${client.nom} - AideSync`,
      client,
      isEdit: true,
      formData: {},
      errors: req.flash('error'),
      currentPage: 'clients'
    });

  } catch (error) {
    console.error('Erreur formulaire édition:', error);
    req.flash('error', 'Erreur lors du chargement du formulaire');
    res.redirect('/clients');
  }
};

exports.create = (req, res) => {
  res.render('pages/clients/clients-form', {
    title: 'Nouveau client - AideSync',
    isEdit: false,
    formData: req.flash('formData')[0] || {},
    errors: req.flash('error'),
    currentPage: 'clients'
  });
};

// Remplace également exports.create pour cohérence :

exports.create = (req, res) => {
  res.render('pages/clients/clients-form', {
    title: 'Nouveau client - AideSync',
    isEdit: false,           // ← AJOUTÉ
    errors: req.flash('error'),
    formData: req.flash('formData')[0] || {},
    currentPage: 'clients'
  });
};

/**
 * Mettre à jour un client
 */
exports.update = async (req, res) => {
  try {
    const clientId = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Client introuvable');
      return res.redirect('/clients');
    }

    await Client.update(clientId, {
      nom: req.body.nom,
      prenom: req.body.prenom,
      email: req.body.email,
      telephone: req.body.telephone,
      adresse: req.body.adresse,
      ville: req.body.ville,
      code_postal: req.body.code_postal,
      code_acces: req.body.code_acces,
      informations_complementaires: req.body.informations_complementaires
    });

    req.flash('success', 'Client modifié avec succès');
    res.redirect(`/clients/${clientId}`);

  } catch (error) {
    console.error('Erreur modification client:', error);
    req.flash('error', 'Erreur lors de la modification du client');
    res.redirect(`/clients/${req.params.id}/clients-form`);
  }
};

/**
 * Désactiver un client
 */
exports.destroy = async (req, res) => {
  try {
    const clientId = req.params.id;
    const prestataireId = req.user.id;

    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ success: false, message: 'Client introuvable' });
    }

    await Client.delete(clientId);

    req.flash('success', 'Client désactivé avec succès');
    res.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la désactivation du client' 
    });
  }
};
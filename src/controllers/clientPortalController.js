// ============================================================
// CONTRÔLEUR PORTAIL CLIENT
// ============================================================

const Client = require('../models/Client');
const Intervention = require('../models/InterventionModel');
const Facture = require('../models/Facture');
const Message = require('../models/Message');

/**
 * Page d'accueil de l'espace client
 */
exports.dashboard = async (req, res) => {
  try {
    const token = req.params.token;
    
    // Trouver le client via son lien sécurisé
    const client = await Client.findBySecureLink(token);
    
    if (!client) {
      return res.status(404).render('pages/client-portal/404', {
        layout: false,
        title: 'Accès non valide - AideSync'
      });
    }
    
    // Récupérer les prochaines interventions
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    
    const interventions = await Intervention.findByPrestataire(
      client.prestataire_id,
      today,
      futureDate.toISOString().split('T')[0]
    );
    
    // Filtrer pour ce client uniquement
    const clientInterventions = interventions.filter(i => i.client_id === client.id);
    
    // Récupérer les factures récentes
    const factures = await Facture.findByClient(client.id);
    
    // Messages non lus
    const unreadCount = await Message.countUnread(client.prestataire_id, client.id, 'client');

    res.render('pages/client-portal/dashboard', {
      layout: 'layouts/client',
      title: `Espace client - ${client.prenom} ${client.nom}`,
      client,
      interventions: clientInterventions,
      factures: factures.slice(0, 5),
      unreadCount
    });

  } catch (error) {
    console.error('Erreur portail client:', error);
    res.status(500).send('Erreur: ' + error.message);
  }
};

/**
 * Page des interventions du client
 */
exports.interventions = async (req, res) => {
  try {
    const token = req.params.token;
    const client = await Client.findBySecureLink(token);
    
    if (!client) {
      return res.status(404).render('pages/client-portal/404', { layout: false });
    }
    
    // Récupérer toutes les interventions
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    
    const allInterventions = await Intervention.findByPrestataire(
      client.prestataire_id,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );
    
    const interventions = allInterventions.filter(i => i.client_id === client.id);
    
    // Messages non lus
    const unreadCount = await Message.countUnread(client.prestataire_id, client.id, 'client');

    res.render('pages/client-portal/interventions', {
      layout: 'layouts/client',
      title: 'Mes interventions - AideSync',
      client,
      interventions,
      unreadCount
    });

  } catch (error) {
    console.error('Erreur interventions client:', error);
    res.status(500).send('Erreur: ' + error.message);
  }
};

/**
 * Page des factures du client
 */
exports.factures = async (req, res) => {
  try {
    const token = req.params.token;
    const client = await Client.findBySecureLink(token);
    
    if (!client) {
      return res.status(404).render('pages/client-portal/404', { layout: false });
    }
    
    const factures = await Facture.findByClient(client.id);
    
    // Messages non lus
    const unreadCount = await Message.countUnread(client.prestataire_id, client.id, 'client');

    res.render('pages/client-portal/factures', {
      layout: 'layouts/client',
      title: 'Mes factures - AideSync',
      client,
      factures,
      unreadCount
    });

  } catch (error) {
    console.error('Erreur factures client:', error);
    res.status(500).send('Erreur: ' + error.message);
  }
};

/**
 * Page de messagerie du client
 */
exports.messages = async (req, res) => {
  try {
    const token = req.params.token;
    const client = await Client.findBySecureLink(token);
    
    if (!client) {
      return res.status(404).render('pages/client-portal/404', { layout: false });
    }
    
    const messages = await Message.getConversation(client.prestataire_id, client.id);
    
    // Marquer comme lus
    await Message.markConversationAsRead(client.prestataire_id, client.id, 'client');
    
    // Messages non lus (sera 0 après markAsRead)
    const unreadCount = 0;

    res.render('pages/client-portal/messages', {
      layout: 'layouts/client',
      title: 'Mes messages - AideSync',
      client,
      messages,
      unreadCount
    });

  } catch (error) {
    console.error('Erreur messages client:', error);
    res.status(500).send('Erreur: ' + error.message);
  }
};

/**
 * Envoyer un message (client)
 */
exports.sendMessage = async (req, res) => {
  try {
    const token = req.params.token;
    const client = await Client.findBySecureLink(token);
    
    if (!client) {
      return res.status(404).json({ success: false });
    }
    
    await Message.create({
      prestataire_id: client.prestataire_id,
      client_id: client.id,
      expediteur: 'client',
      contenu: req.body.contenu
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Erreur envoi message client:', error);
    res.status(500).json({ success: false });
  }
};
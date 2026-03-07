// ============================================================
// CONTRÔLEUR MESSAGES
// ============================================================

const Message = require('../models/Message');
const Client = require('../models/Client');

/**
 * Liste des conversations
 */
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    
    // Récupérer tous les clients
    const clients = await Client.findByPrestataire(prestataireId);
    
    // Récupérer les messages récents pour chaque client
    const conversations = [];
    
    for (const client of clients) {
      const messages = await Message.getConversation(prestataireId, client.id);
      const unreadCount = await Message.countUnread(prestataireId, client.id, 'prestataire');
      
      if (messages.length > 0) {
        conversations.push({
          client,
          lastMessage: messages[0],
          unreadCount
        });
      }
    }
    
    // Trier par message le plus récent
    conversations.sort((a, b) => 
      new Date(b.lastMessage.date_envoi) - new Date(a.lastMessage.date_envoi)
    );

    res.render('pages/messages/index', {
      title: 'Messagerie - AideSync',
      conversations,
      currentPage: 'messages'
    });

  } catch (error) {
    console.error('Erreur messagerie:', error);
    req.flash('error', 'Erreur lors du chargement de la messagerie');
    res.redirect('/dashboard');
  }
};

/**
 * Afficher une conversation avec un client
 */
exports.show = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const clientId = req.params.clientId;
    
    // Vérifier que le client appartient au prestataire
    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      req.flash('error', 'Client introuvable');
      return res.redirect('/messages');
    }
    
    const client = await Client.findById(clientId);
    const messages = await Message.getConversation(prestataireId, clientId);
    
    // Marquer tous les messages comme lus
    await Message.markConversationAsRead(prestataireId, clientId, 'prestataire');

    res.render('pages/messages/conversation', {
      title: `Conversation avec ${client.prenom} ${client.nom} - AideSync`,
      client,
      messages,
      currentPage: 'messages'
    });

  } catch (error) {
    console.error('Erreur conversation:', error);
    req.flash('error', 'Erreur lors du chargement de la conversation');
    res.redirect('/messages');
  }
};


exports.getUnreadCount = async (req, res) => {
  try {
    const { query } = require('../config/database');
    const result = await query(
      `SELECT COUNT(*) as count
       FROM messages
       WHERE prestataire_id = $1
         AND expediteur = 'client'
         AND lu = false`,
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0]?.count || 0) });
  } catch (err) {
    res.json({ count: 0 });
  }
};

/**
 * Envoyer un message
 */
exports.send = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const clientId = req.params.clientId;
    
    // Vérifier que le client appartient au prestataire
    const belongs = await Client.belongsToPrestataire(clientId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ 
        success: false, 
        message: 'Client introuvable' 
      });
    }
    
    // Créer le message
    await Message.create({
      prestataire_id: prestataireId,
      client_id: clientId,
      expediteur: 'prestataire',
      contenu: req.body.contenu
    });

    res.json({ 
      success: true, 
      message: 'Message envoyé' 
    });

  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi du message' 
    });
  }
};

/**
 * Marquer une conversation comme lue
 */
exports.markAsRead = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    const clientId = req.params.clientId;
    
    await Message.markConversationAsRead(prestataireId, clientId, 'prestataire');
    
    res.json({ success: true });

  } catch (error) {
    console.error('Erreur mark as read:', error);
    res.status(500).json({ success: false });
  }
};
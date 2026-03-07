// ============================================================
// MODÈLE MESSAGE
// ============================================================

const { pool, query } = require('../config/database');

class Message {
  
  /**
   * Créer un nouveau message
   */
static async create(data) {
  const { 
    prestataire_id, 
    client_id, 
    expediteur, 
    contenu 
  } = data;
  
  try {
    // Remplir les colonnes selon le schéma original
    const expediteurPrestataire = expediteur === 'prestataire' ? prestataire_id : null;
    const expediteurClient = expediteur === 'client' ? client_id : null;
    const destPrestataire = expediteur === 'client' ? prestataire_id : null;
    const destClient = expediteur === 'prestataire' ? client_id : null;
    
    const result = await query(
      `INSERT INTO messages 
      (prestataire_id, client_id, expediteur,
       expediteur_prestataire_id, expediteur_client_id,
       destinataire_prestataire_id, destinataire_client_id, 
       contenu, statut) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'envoye') 
      RETURNING *`,
      [
        prestataire_id, 
        client_id, 
        expediteur,
        expediteurPrestataire,
        expediteurClient,
        destPrestataire, 
        destClient,
        contenu
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erreur create message:', error);
    throw error;
  }
}

  /**
   * Récupérer une conversation entre prestataire et client
   */
  static async getConversation(prestataire_id, client_id) {
    try {
      const result = await query(
        `SELECT * FROM messages 
        WHERE prestataire_id = $1 AND client_id = $2 
        ORDER BY date_envoi DESC`,
        [prestataire_id, client_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur getConversation:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les messages d'un prestataire
   */
  static async findByPrestataire(prestataire_id) {
    try {
      const result = await query(
        `SELECT m.*, 
          c.nom as client_nom, c.prenom as client_prenom
        FROM messages m
        JOIN clients c ON m.client_id = c.id
        WHERE m.prestataire_id = $1
        ORDER BY m.date_envoi DESC`,
        [prestataire_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur findByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Récupérer les messages non lus
   */
  static async getUnreadByPrestataire(prestataire_id) {
    try {
      const result = await query(
        `SELECT m.*, 
          c.nom as client_nom, c.prenom as client_prenom
        FROM messages m
        JOIN clients c ON m.client_id = c.id
        WHERE m.prestataire_id = $1 
          AND m.expediteur = 'client'
          AND m.lu = false
        ORDER BY m.date_envoi DESC`,
        [prestataire_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur getUnreadByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Récupérer les messages d'un client
   */
  static async findByClient(client_id) {
    try {
      const result = await query(
        `SELECT * FROM messages 
        WHERE client_id = $1 
        ORDER BY date_envoi DESC`,
        [client_id]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Erreur findByClient:', error);
      throw error;
    }
  }

  /**
   * Marquer un message comme lu
   */
  static async markAsRead(message_id) {
    try {
      const result = await query(
        `UPDATE messages 
        SET lu = true, date_lecture = CURRENT_TIMESTAMP 
        WHERE id = $1 
        RETURNING *`,
        [message_id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur markAsRead:', error);
      throw error;
    }
  }

  /**
   * Marquer toute une conversation comme lue
   */
  static async markConversationAsRead(prestataire_id, client_id, destinataire) {
    try {
      // Si destinataire = 'prestataire', on marque les messages envoyés par le client comme lus
      // Si destinataire = 'client', on marque les messages envoyés par le prestataire comme lus
      const expediteur = destinataire === 'prestataire' ? 'client' : 'prestataire';
      
      await query(
        `UPDATE messages 
        SET lu = true, date_lecture = CURRENT_TIMESTAMP 
        WHERE prestataire_id = $1 
          AND client_id = $2 
          AND expediteur = $3
          AND lu = false`,
        [prestataire_id, client_id, expediteur]
      );
      
      return true;
    } catch (error) {
      console.error('Erreur markConversationAsRead:', error);
      throw error;
    }
  }

  /**
   * Archiver un message
   */
  static async archive(message_id) {
    try {
      const result = await query(
        `UPDATE messages 
        SET archive = true 
        WHERE id = $1 
        RETURNING *`,
        [message_id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur archive:', error);
      throw error;
    }
  }

  /**
   * Compter les messages non lus
   */
  static async countUnread(prestataire_id, client_id, destinataire) {
    try {
      // Si destinataire = 'prestataire', on compte les messages du client non lus
      // Si destinataire = 'client', on compte les messages du prestataire non lus
      const expediteur = destinataire === 'prestataire' ? 'client' : 'prestataire';
      
      const result = await query(
        `SELECT COUNT(*) as count 
        FROM messages 
        WHERE prestataire_id = $1 
          AND client_id = $2 
          AND expediteur = $3
          AND lu = false`,
        [prestataire_id, client_id, expediteur]
      );
      
      return parseInt(result.rows[0].count) || 0;
    } catch (error) {
      console.error('Erreur countUnread:', error);
      return 0;
    }
  }

  /**
   * Supprimer un message
   */
  static async delete(message_id) {
    try {
      await query('DELETE FROM messages WHERE id = $1', [message_id]);
      return true;
    } catch (error) {
      console.error('Erreur delete:', error);
      throw error;
    }
  }

  /**
   * Supprimer les anciens messages (nettoyage)
   */
  static async deleteOld(days = 365) {
    try {
      await query(
        `DELETE FROM messages 
        WHERE date_envoi < CURRENT_DATE - INTERVAL '${days} days'`,
        []
      );
      return true;
    } catch (error) {
      console.error('Erreur deleteOld:', error);
      throw error;
    }
  }
}

module.exports = Message;
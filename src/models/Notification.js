// ============================================================
// MODÈLE NOTIFICATION
// Gestion du système de notifications
// ============================================================

const { pool, query } = require('../config/database');

class Notification {
  
  /**
   * Créer une notification
   */
  static async create(data) {
    const { prestataire_id, client_id, type, titre, message, lien } = data;
    
    try {
      const result = await query(
        `INSERT INTO notifications 
        (prestataire_id, client_id, type, titre, message, lien)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [prestataire_id, client_id, type, titre, message, lien]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur create:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications d'un prestataire
   */
  static async findByPrestataire(prestataire_id, limit = 20) {
    try {
      const result = await query(
        `SELECT * FROM notifications 
        WHERE prestataire_id = $1
        ORDER BY date_creation DESC
        LIMIT $2`,
        [prestataire_id, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications non lues d'un prestataire
   */
  static async getUnreadByPrestataire(prestataire_id) {
    try {
      const result = await query(
        `SELECT * FROM notifications 
        WHERE prestataire_id = $1 AND lue = false
        ORDER BY date_creation DESC`,
        [prestataire_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur getUnreadByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Récupérer les notifications d'un client
   */
  static async findByClient(client_id, limit = 20) {
    try {
      const result = await query(
        `SELECT * FROM notifications 
        WHERE client_id = $1
        ORDER BY date_creation DESC
        LIMIT $2`,
        [client_id, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findByClient:', error);
      throw error;
    }
  }

  /**
   * Marquer une notification comme lue
   */
  static async markAsRead(id) {
    try {
      const result = await query(
        `UPDATE notifications 
        SET lue = true, date_lecture = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur markAsRead:', error);
      throw error;
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   */
  static async markAllAsRead(prestataire_id) {
    try {
      await query(
        `UPDATE notifications 
        SET lue = true, date_lecture = CURRENT_TIMESTAMP
        WHERE prestataire_id = $1 AND lue = false`,
        [prestataire_id]
      );
      return true;
    } catch (error) {
      console.error('Erreur markAllAsRead:', error);
      throw error;
    }
  }

  /**
   * Compter les notifications non lues
   */
  static async countUnread(prestataire_id) {
    try {
      const result = await query(
        'SELECT COUNT(*) as total FROM notifications WHERE prestataire_id = $1 AND lue = false',
        [prestataire_id]
      );
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Erreur countUnread:', error);
      throw error;
    }
  }

  /**
   * Supprimer une notification
   */
  static async delete(id) {
    try {
      await query('DELETE FROM notifications WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Erreur delete:', error);
      throw error;
    }
  }

  /**
   * Supprimer les notifications anciennes (plus de 30 jours)
   */
  static async deleteOld(days = 30) {
    try {
      const result = await query(
        `DELETE FROM notifications 
        WHERE date_creation < CURRENT_DATE - INTERVAL '${days} days'
        RETURNING id`
      );
      return result.rows.length;
    } catch (error) {
      console.error('Erreur deleteOld:', error);
      throw error;
    }
  }

  // ============================================================
  // NOTIFICATIONS PRÉDÉFINIES
  // ============================================================

  /**
   * Notification de rappel d'intervention
   */
  static async createInterventionReminder(prestataire_id, intervention) {
    return await this.create({
      prestataire_id,
      client_id: null,
      type: 'rappel_intervention',
      titre: 'Intervention programmée',
      message: `Intervention chez ${intervention.client_nom} ${intervention.client_prenom} le ${intervention.date_intervention} à ${intervention.heure_debut}`,
      lien: `/interventions/${intervention.id}`
    });
  }

  /**
   * Notification de nouvelle facture
   */
  static async createInvoiceNotification(client_id, facture) {
    return await this.create({
      prestataire_id: null,
      client_id,
      type: 'facture_emise',
      titre: 'Nouvelle facture disponible',
      message: `Votre facture ${facture.numero_facture} d'un montant de ${facture.montant_ttc}€ est disponible`,
      lien: `/factures/${facture.id}`
    });
  }

  /**
   * Notification de paiement reçu
   */
  static async createPaymentNotification(prestataire_id, facture) {
    return await this.create({
      prestataire_id,
      client_id: null,
      type: 'paiement_recu',
      titre: 'Paiement reçu',
      message: `Paiement de ${facture.montant_ttc}€ reçu pour la facture ${facture.numero_facture}`,
      lien: `/factures/${facture.id}`
    });
  }

  /**
   * Notification de relance de paiement
   */
  static async createPaymentReminderNotification(prestataire_id, facture) {
    return await this.create({
      prestataire_id,
      client_id: null,
      type: 'relance_paiement',
      titre: 'Facture en retard',
      message: `La facture ${facture.numero_facture} est en retard de ${facture.jours_retard} jours`,
      lien: `/factures/${facture.id}`
    });
  }

  /**
   * Notification de nouveau message
   */
  static async createMessageNotification(prestataire_id, message) {
    return await this.create({
      prestataire_id,
      client_id: null,
      type: 'nouveau_message',
      titre: 'Nouveau message',
      message: `Nouveau message de ${message.expediteur_nom}`,
      lien: `/messages/${message.id}`
    });
  }
}

module.exports = Notification;
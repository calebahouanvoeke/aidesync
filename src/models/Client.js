// ============================================================
// MODÈLE CLIENT
// Gestion des bénéficiaires des services
// ============================================================

const { pool, query } = require('../config/database');
const crypto = require('crypto');

class Client {
  
  // ============================================================
  // MÉTHODES DE LECTURE
  // ============================================================
  
  /**
   * Trouver un client par ID
   */
  static async findById(id) {
    try {
      const result = await query(
        'SELECT * FROM clients WHERE id = $1',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findById:', error);
      throw error;
    }
  }

  /**
   * Trouver par lien sécurisé (pour accès client)
   */
  static async findBySecureLink(token) {
    try {
      const result = await query(
        'SELECT * FROM clients WHERE lien_acces_securise = $1 AND statut_actif = true',
        [token]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findBySecureLink:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les clients d'un prestataire
   */
  static async findByPrestataire(prestataire_id, filters = {}) {
    try {
      let sql = `
        SELECT c.*, 
          COUNT(DISTINCT i.id) as nombre_interventions,
          COALESCE(SUM(i.duree_minutes) FILTER (WHERE i.statut = 'effectuee'), 0) / 60.0 as heures_totales,
          MAX(i.date_intervention) FILTER (WHERE i.statut = 'effectuee') as derniere_intervention
        FROM clients c
        LEFT JOIN interventions i ON c.id = i.client_id
        WHERE c.prestataire_id = $1
      `;
      
      const params = [prestataire_id];
      let paramCount = 1;

      // Filtres optionnels
      if (filters.statut_actif !== undefined) {
        paramCount++;
        sql += ` AND c.statut_actif = $${paramCount}`;
        params.push(filters.statut_actif);
      }

      if (filters.search) {
        paramCount++;
        sql += ` AND (c.nom ILIKE $${paramCount} OR c.prenom ILIKE $${paramCount} OR c.ville ILIKE $${paramCount})`;
        params.push(`%${filters.search}%`);
      }

      sql += ` GROUP BY c.id ORDER BY c.nom, c.prenom`;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Erreur findByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Compter les clients d'un prestataire
   */
  static async countByPrestataire(prestataire_id) {
    try {
      const result = await query(
        'SELECT COUNT(*) as total FROM clients WHERE prestataire_id = $1 AND statut_actif = true',
        [prestataire_id]
      );
      return parseInt(result.rows[0].total);
    } catch (error) {
      console.error('Erreur countByPrestataire:', error);
      throw error;
    }
  }

  // ============================================================
  // MÉTHODES DE CRÉATION ET MODIFICATION
  // ============================================================

  /**
   * Créer un nouveau client
   */
  static async create(prestataire_id, data) {
    const { nom, prenom, email, telephone, adresse, ville, code_postal, code_acces, informations_complementaires } = data;
    
    try {
      // Générer un lien d'accès sécurisé
      const lien_acces_securise = crypto.randomBytes(32).toString('hex');

      const result = await query(
        `INSERT INTO clients 
        (prestataire_id, nom, prenom, email, telephone, adresse, ville, code_postal, 
         code_acces, informations_complementaires, lien_acces_securise) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
        RETURNING *`,
        [prestataire_id, nom, prenom, email, telephone, adresse, ville, code_postal,
         code_acces, informations_complementaires, lien_acces_securise]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erreur create:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un client
   */
  static async update(id, data) {
    const { nom, prenom, email, telephone, adresse, ville, code_postal, code_acces, informations_complementaires } = data;
    
    try {
      const result = await query(
        `UPDATE clients 
        SET nom = $1, prenom = $2, email = $3, telephone = $4, 
            adresse = $5, ville = $6, code_postal = $7, 
            code_acces = $8, informations_complementaires = $9,
            date_derniere_modification = CURRENT_TIMESTAMP
        WHERE id = $10 
        RETURNING *`,
        [nom, prenom, email, telephone, adresse, ville, code_postal,
         code_acces, informations_complementaires, id]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur update:', error);
      throw error;
    }
  }

  /**
   * Désactiver un client (soft delete)
   */
  static async deactivate(id) {
    try {
      const result = await query(
        'UPDATE clients SET statut_actif = false WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur deactivate:', error);
      throw error;
    }
  }

  /**
   * Réactiver un client
   */
  static async activate(id) {
    try {
      const result = await query(
        'UPDATE clients SET statut_actif = true WHERE id = $1 RETURNING *',
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur activate:', error);
      throw error;
    }
  }

  /**
   * Supprimer définitivement un client
   */
  static async delete(id) {
    try {
      await query('DELETE FROM clients WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Erreur delete:', error);
      throw error;
    }
  }

  // ============================================================
  // LIEN SÉCURISÉ
  // ============================================================

  /**
   * Générer un nouveau lien d'accès sécurisé
   */
  static async regenerateSecureLink(id) {
    try {
      const lien_acces_securise = crypto.randomBytes(32).toString('hex');
      
      const result = await query(
        'UPDATE clients SET lien_acces_securise = $1 WHERE id = $2 RETURNING lien_acces_securise',
        [lien_acces_securise, id]
      );

      return result.rows[0]?.lien_acces_securise || null;
    } catch (error) {
      console.error('Erreur regenerateSecureLink:', error);
      throw error;
    }
  }

  // ============================================================
  // STATISTIQUES ET HISTORIQUE
  // ============================================================

  /**
   * Obtenir l'historique complet d'un client
   */
  static async getHistory(id) {
    try {
      // Interventions
      const interventions = await query(
        `SELECT i.*, ts.nom as type_service_nom, ts.couleur 
        FROM interventions i
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.client_id = $1 
        ORDER BY i.date_intervention DESC, i.heure_debut DESC
        LIMIT 50`,
        [id]
      );

      // Factures
      const factures = await query(
        `SELECT * FROM factures 
        WHERE client_id = $1 
        ORDER BY date_emission DESC
        LIMIT 20`,
        [id]
      );

      // Messages
      const messages = await query(
        `SELECT * FROM messages 
        WHERE destinataire_client_id = $1 OR expediteur_client_id = $1
        ORDER BY date_envoi DESC
        LIMIT 20`,
        [id]
      );

      return {
        interventions: interventions.rows,
        factures: factures.rows,
        messages: messages.rows
      };
    } catch (error) {
      console.error('Erreur getHistory:', error);
      throw error;
    }
  }

  /**
   * Statistiques d'un client
   */
static async getStatistics(id) {
  try {
    const stats = await query(
      `SELECT 
        -- Stats interventions (sous-requête isolée)
        (SELECT COUNT(*) FROM interventions WHERE client_id = $1) 
          AS total_interventions,
        (SELECT COUNT(*) FROM interventions WHERE client_id = $1 AND statut = 'effectuee') 
          AS interventions_effectuees,
        (SELECT COALESCE(SUM(duree_minutes), 0) / 60.0 FROM interventions WHERE client_id = $1 AND statut = 'effectuee') 
          AS heures_totales,
        (SELECT MAX(date_intervention) FROM interventions WHERE client_id = $1 AND statut = 'effectuee') 
          AS derniere_intervention,

        -- Stats factures (sous-requête isolée)
        (SELECT COUNT(*) FROM factures WHERE client_id = $1) 
          AS total_factures,
        (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures WHERE client_id = $1) 
          AS montant_total_facture,
        (SELECT COALESCE(SUM(montant_ttc), 0) FROM factures WHERE client_id = $1 AND statut = 'payee') 
          AS montant_paye`,
      [id]
    );

    return stats.rows[0] || {
      total_interventions: 0,
      interventions_effectuees: 0,
      heures_totales: 0,
      total_factures: 0,
      montant_total_facture: 0,
      montant_paye: 0,
      derniere_intervention: null
    };
  } catch (error) {
    console.error('Erreur getStatistics:', error);
    throw error;
  }
}

  /**
   * Prochaines interventions d'un client
   */
  static async getUpcomingInterventions(id, limit = 10) {
    try {
      const result = await query(
        `SELECT i.*, ts.nom as type_service_nom, ts.couleur, ts.icone
        FROM interventions i
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.client_id = $1 
          AND i.statut = 'planifiee'
          AND i.date_intervention >= CURRENT_DATE
        ORDER BY i.date_intervention, i.heure_debut
        LIMIT $2`,
        [id, limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Erreur getUpcomingInterventions:', error);
      throw error;
    }
  }

  /**
   * Vérifier si un client appartient à un prestataire
   */
  static async belongsToPrestataire(client_id, prestataire_id) {
    try {
      const result = await query(
        'SELECT id FROM clients WHERE id = $1 AND prestataire_id = $2',
        [client_id, prestataire_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur belongsToPrestataire:', error);
      throw error;
    }
  }
}

module.exports = Client;
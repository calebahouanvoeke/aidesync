// ============================================================
// MODÈLE INTERVENTION
// ============================================================

const { pool, query } = require('../config/database');

class Intervention {
  
  static async findById(id) {
    try {
      const result = await query(
        `SELECT i.*, 
          c.nom as client_nom, c.prenom as client_prenom, c.adresse, c.ville,
          ts.nom as type_service_nom, ts.couleur, ts.icone
        FROM interventions i
        JOIN clients c ON i.client_id = c.id
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findById:', error);
      throw error;
    }
  }

  static async findByPrestataire(prestataire_id, dateDebut, dateFin) {
    try {
      const result = await query(
        `SELECT i.*, 
          c.nom as client_nom, c.prenom as client_prenom, c.adresse, c.ville, c.telephone,
          ts.nom as type_service_nom, ts.couleur, ts.icone
        FROM interventions i
        JOIN clients c ON i.client_id = c.id
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.prestataire_id = $1
          AND i.date_intervention BETWEEN $2 AND $3
        ORDER BY i.date_intervention, i.heure_debut`,
        [prestataire_id, dateDebut, dateFin]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findByPrestataire:', error);
      throw error;
    }
  }

  static async findTodayInterventions(prestataire_id) {
    try {
      const result = await query(
        `SELECT i.*, 
          c.nom as client_nom, c.prenom as client_prenom, c.adresse, c.ville, c.telephone, c.code_acces,
          ts.nom as type_service_nom, ts.couleur, ts.icone
        FROM interventions i
        JOIN clients c ON i.client_id = c.id
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.prestataire_id = $1
          AND i.date_intervention = CURRENT_DATE
          AND i.statut IN ('planifiee', 'effectuee')
        ORDER BY i.heure_debut`,
        [prestataire_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findTodayInterventions:', error);
      throw error;
    }
  }

  static async findUpcoming(prestataire_id, limit = 10) {
    try {
      const result = await query(
        `SELECT i.*, 
          c.nom as client_nom, c.prenom as client_prenom, c.adresse, c.ville,
          ts.nom as type_service_nom, ts.couleur, ts.icone
        FROM interventions i
        JOIN clients c ON i.client_id = c.id
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.prestataire_id = $1
          AND i.date_intervention >= CURRENT_DATE
          AND i.statut = 'planifiee'
        ORDER BY i.date_intervention, i.heure_debut
        LIMIT $2`,
        [prestataire_id, limit]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findUpcoming:', error);
      throw error;
    }
  }

  static async create(data) {
    const { 
      prestataire_id, client_id, type_service_id, 
      date_intervention, heure_debut, heure_fin, notes_prestataire 
    } = data;
    
    try {
      const result = await query(
        `INSERT INTO interventions 
        (prestataire_id, client_id, type_service_id, date_intervention, 
         heure_debut, heure_fin, notes_prestataire) 
        VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *`,
        [prestataire_id, client_id, type_service_id, date_intervention,
         heure_debut, heure_fin, notes_prestataire]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Erreur create:', error);
      throw error;
    }
  }

  static async update(id, data) {
    const { 
      client_id, type_service_id, date_intervention, 
      heure_debut, heure_fin, notes_prestataire 
    } = data;
    
    try {
      const result = await query(
        `UPDATE interventions 
        SET client_id = $1, type_service_id = $2, date_intervention = $3,
            heure_debut = $4, heure_fin = $5, notes_prestataire = $6,
            date_modification = CURRENT_TIMESTAMP
        WHERE id = $7 
        RETURNING *`,
        [client_id, type_service_id, date_intervention, heure_debut, heure_fin, notes_prestataire, id]
      );

      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur update:', error);
      throw error;
    }
  }

  static async markAsDone(id, notes = null) {
    try {
      const result = await query(
        `UPDATE interventions 
        SET statut = 'effectuee', 
            notes_prestataire = COALESCE($2, notes_prestataire),
            date_modification = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *`,
        [id, notes]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur markAsDone:', error);
      throw error;
    }
  }

  static async cancel(id, raison = null) {
    try {
      const result = await query(
        `UPDATE interventions 
        SET statut = 'annulee',
            notes_prestataire = CASE 
              WHEN $2 IS NOT NULL THEN CONCAT(COALESCE(notes_prestataire, ''), ' [ANNULATION: ', $2, ']')
              ELSE notes_prestataire
            END,
            date_modification = CURRENT_TIMESTAMP
        WHERE id = $1 
        RETURNING *`,
        [id, raison]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur cancel:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await query('DELETE FROM interventions WHERE id = $1', [id]);
      return true;
    } catch (error) {
      console.error('Erreur delete:', error);
      throw error;
    }
  }

  static async belongsToPrestataire(intervention_id, prestataire_id) {
    try {
      const result = await query(
        'SELECT id FROM interventions WHERE id = $1 AND prestataire_id = $2',
        [intervention_id, prestataire_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur belongsToPrestataire:', error);
      return false;
    }
  }
}

module.exports = Intervention;
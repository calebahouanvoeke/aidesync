// ============================================================
// MODÈLE FACTURE
// Gestion de la facturation automatique
// ============================================================

const { pool, query, getClient } = require('../config/database');

class Facture {
  
  // ============================================================
  // MÉTHODES DE LECTURE
  // ============================================================
  
  /**
   * Trouver une facture par ID
   */
  static async findById(id) {
    try {
      const result = await query(
        `SELECT f.*, 
          c.nom as client_nom, c.prenom as client_prenom, 
          c.adresse, c.ville, c.code_postal, c.email
        FROM factures f
        JOIN clients c ON f.client_id = c.id
        WHERE f.id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findById:', error);
      throw error;
    }
  }

  /**
   * Trouver par numéro de facture
   */
  static async findByNumero(numero_facture) {
    try {
      const result = await query(
        'SELECT * FROM factures WHERE numero_facture = $1',
        [numero_facture]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findByNumero:', error);
      throw error;
    }
  }

  /**
   * Récupérer toutes les factures d'un prestataire
   */
  static async findByPrestataire(prestataire_id, filters = {}) {
    try {
      let sql = `
        SELECT f.*, 
          c.nom as client_nom, c.prenom as client_prenom
        FROM factures f
        JOIN clients c ON f.client_id = c.id
        WHERE f.prestataire_id = $1
      `;
      
      const params = [prestataire_id];
      let paramCount = 1;

      if (filters.statut) {
        paramCount++;
        sql += ` AND f.statut = $${paramCount}`;
        params.push(filters.statut);
      }

      if (filters.client_id) {
        paramCount++;
        sql += ` AND f.client_id = $${paramCount}`;
        params.push(filters.client_id);
      }

      if (filters.annee) {
        paramCount++;
        sql += ` AND EXTRACT(YEAR FROM f.date_emission) = $${paramCount}`;
        params.push(filters.annee);
      }

      if (filters.mois) {
        paramCount++;
        sql += ` AND EXTRACT(MONTH FROM f.date_emission) = $${paramCount}`;
        params.push(filters.mois);
      }

      sql += ` ORDER BY f.date_emission DESC, f.numero_facture DESC`;

      const result = await query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('Erreur findByPrestataire:', error);
      throw error;
    }
  }

  /**
   * Récupérer les factures d'un client
   */
  static async findByClient(client_id) {
    try {
      const result = await query(
        'SELECT * FROM factures WHERE client_id = $1 ORDER BY date_emission DESC',
        [client_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findByClient:', error);
      throw error;
    }
  }


  /**
 * Le client déclare avoir payé avec preuve
 */
static async declarerPaiementAvecPreuve(facture_id, data) {
  try {
    const { 
      preuve_path, 
      methode_paiement, 
      numero_transaction, 
      notes 
    } = data;
    
    const notesComplet = `Méthode: ${methode_paiement}` +
                        (numero_transaction ? ` - Transaction: ${numero_transaction}` : '') +
                        (notes ? ` - ${notes}` : '');
    
    const result = await query(
      `UPDATE factures 
      SET paiement_declare_par_client = true,
          date_declaration_paiement = CURRENT_TIMESTAMP,
          preuve_paiement_path = $2,
          methode_paiement_declaree = $3,
          notes_paiement = $4
      WHERE id = $1 
      RETURNING *`,
      [facture_id, preuve_path, methode_paiement, notesComplet]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erreur declarerPaiementAvecPreuve:', error);
    throw error;
  }
}

/**
 * Récupérer les factures en attente de validation de paiement
 */
static async findPendingPaymentValidation(prestataire_id) {
  try {
    const result = await query(
      `SELECT f.*, 
        c.nom as client_nom, 
        c.prenom as client_prenom, 
        c.email as client_email
      FROM factures f
      JOIN clients c ON f.client_id = c.id
      WHERE f.prestataire_id = $1 
        AND f.paiement_declare_par_client = true
        AND f.statut != 'payee'
        AND f.statut != 'annulee'
      ORDER BY f.date_declaration_paiement DESC`,
      [prestataire_id]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Erreur findPendingPaymentValidation:', error);
    return [];
  }
}

/**
 * Invalider une déclaration de paiement (si fausse)
 */
static async invaliderDeclarationPaiement(facture_id, raison) {
  try {
    const result = await query(
      `UPDATE factures 
      SET paiement_declare_par_client = false,
          date_declaration_paiement = NULL,
          preuve_paiement_path = NULL,
          methode_paiement_declaree = NULL,
          notes_paiement = CONCAT(COALESCE(notes_paiement, ''), ' [INVALIDE: ', $2, ']')
      WHERE id = $1 
      RETURNING *`,
      [facture_id, raison]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Erreur invaliderDeclarationPaiement:', error);
    throw error;
  }
}

  /**
   * Récupérer les factures en retard
   */
  static async findOverdue(prestataire_id) {
    try {
      const result = await query(
        `SELECT f.*, 
          c.nom as client_nom, c.prenom as client_prenom, c.email, c.telephone,
          CURRENT_DATE - f.date_echeance as jours_retard
        FROM factures f
        JOIN clients c ON f.client_id = c.id
        WHERE f.prestataire_id = $1
          AND f.statut IN ('emise', 'en_retard')
          AND f.date_echeance < CURRENT_DATE
        ORDER BY f.date_echeance`,
        [prestataire_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findOverdue:', error);
      throw error;
    }
  }

  // ============================================================
  // GÉNÉRATION DE FACTURES
  // ============================================================

  /**
   * Générer une facture pour un client (mois donné)
   */
  static async generate(prestataire_id, client_id, annee, mois) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Calculer les dates de période
      const periode_debut = new Date(annee, mois - 1, 1);
      const periode_fin = new Date(annee, mois, 0);
      const date_echeance = new Date(annee, mois, 15); // 15 du mois suivant

      // Générer le numéro de facture
      const numero_facture = await this.generateNumero(prestataire_id);

      // Créer la facture
      const factureResult = await client.query(
        `INSERT INTO factures 
        (prestataire_id, client_id, numero_facture, date_emission, date_echeance, 
         periode_debut, periode_fin, statut)
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, 'brouillon')
        RETURNING *`,
        [prestataire_id, client_id, numero_facture, date_echeance, periode_debut, periode_fin]
      );

      const facture = factureResult.rows[0];

      // Récupérer les interventions effectuées sur la période
      const interventionsResult = await client.query(
        `SELECT i.*, ts.nom as type_service, ts.tarif_horaire_defaut
        FROM interventions i
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.prestataire_id = $1 
          AND i.client_id = $2
          AND i.date_intervention BETWEEN $3 AND $4
          AND i.statut = 'effectuee'
          AND i.id NOT IN (SELECT intervention_id FROM lignes_facture WHERE intervention_id IS NOT NULL)`,
        [prestataire_id, client_id, periode_debut, periode_fin]
      );

      // Créer les lignes de facture
      for (const intervention of interventionsResult.rows) {
        const heures = intervention.duree_minutes / 60;
        const description = `${intervention.type_service} - ${intervention.date_intervention}`;
        
        await client.query(
          `INSERT INTO lignes_facture 
          (facture_id, intervention_id, description, quantite, prix_unitaire)
          VALUES ($1, $2, $3, $4, $5)`,
          [facture.id, intervention.id, description, heures, intervention.tarif_horaire_defaut]
        );
      }

      // Mettre à jour le statut de la facture
      const updatedResult = await client.query(
        `UPDATE factures SET statut = 'emise' WHERE id = $1 RETURNING *`,
        [facture.id]
      );

      await client.query('COMMIT');
      
      return updatedResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur generate:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Générer les factures mensuelles pour tous les clients d'un prestataire
   */
  static async generateMonthlyBatch(prestataire_id, annee, mois) {
    try {
      // Récupérer tous les clients actifs ayant des interventions effectuées
      const clientsResult = await query(
        `SELECT DISTINCT c.id
        FROM clients c
        JOIN interventions i ON c.id = i.client_id
        WHERE c.prestataire_id = $1
          AND c.statut_actif = true
          AND i.statut = 'effectuee'
          AND EXTRACT(YEAR FROM i.date_intervention) = $2
          AND EXTRACT(MONTH FROM i.date_intervention) = $3
          AND i.id NOT IN (SELECT intervention_id FROM lignes_facture WHERE intervention_id IS NOT NULL)`,
        [prestataire_id, annee, mois]
      );

      const factures = [];
      
      for (const client of clientsResult.rows) {
        try {
          const facture = await this.generate(prestataire_id, client.id, annee, mois);
          factures.push(facture);
        } catch (error) {
          console.error(`Erreur génération facture pour client ${client.id}:`, error);
        }
      }

      return factures;
    } catch (error) {
      console.error('Erreur generateMonthlyBatch:', error);
      throw error;
    }
  }

  /**
   * Générer un numéro de facture unique
   */
  static async generateNumero(prestataire_id) {
    try {
      const now = new Date();
      const annee = now.getFullYear();
      const mois = String(now.getMonth() + 1).padStart(2, '0');
      const prefix = `F${annee}${mois}`;

      // Trouver le dernier numéro du mois
      const result = await query(
        `SELECT numero_facture 
        FROM factures 
        WHERE prestataire_id = $1 
          AND numero_facture LIKE $2
        ORDER BY numero_facture DESC 
        LIMIT 1`,
        [prestataire_id, `${prefix}%`]
      );

      let sequence = 1;
      if (result.rows.length > 0) {
        const lastNumero = result.rows[0].numero_facture;
        const lastSequence = parseInt(lastNumero.slice(-4));
        sequence = lastSequence + 1;
      }

      return `${prefix}${String(sequence).padStart(4, '0')}`;
    } catch (error) {
      console.error('Erreur generateNumero:', error);
      throw error;
    }
  }

  // ============================================================
  // GESTION DU STATUT
  // ============================================================

  /**
   * Marquer comme payée
   */
  static async markAsPaid(id, mode_paiement = null, date_paiement = null) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Mettre à jour la facture
      const factureResult = await client.query(
        `UPDATE factures 
        SET statut = 'payee', date_paiement = COALESCE($2, CURRENT_TIMESTAMP)
        WHERE id = $1 
        RETURNING *`,
        [id, date_paiement]
      );

      const facture = factureResult.rows[0];

      // Créer l'entrée de paiement
      if (mode_paiement) {
        await client.query(
          `INSERT INTO paiements (facture_id, montant, mode_paiement, statut)
          VALUES ($1, $2, $3, 'recu')`,
          [id, facture.montant_ttc, mode_paiement]
        );
      }

      await client.query('COMMIT');
      
      return facture;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Erreur markAsPaid:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Annuler une facture
   */
  static async cancel(id, raison = null) {
    try {
      const result = await query(
        `UPDATE factures 
        SET statut = 'annulee',
            notes = CASE 
              WHEN $2 IS NOT NULL THEN CONCAT(COALESCE(notes, ''), ' [ANNULATION: ', $2, ']')
              ELSE notes
            END
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

  /**
   * Mettre à jour le statut des factures en retard
   */
  static async updateOverdueStatus() {
    try {
      const result = await query(
        `UPDATE factures 
        SET statut = 'en_retard'
        WHERE statut = 'emise' 
          AND date_echeance < CURRENT_DATE
        RETURNING id`
      );
      return result.rows.length;
    } catch (error) {
      console.error('Erreur updateOverdueStatus:', error);
      throw error;
    }
  }

  // ============================================================
  // LIGNES DE FACTURE
  // ============================================================

  /**
   * Récupérer les lignes d'une facture
   */
  static async getLines(facture_id) {
    try {
      const result = await query(
        'SELECT * FROM lignes_facture WHERE facture_id = $1 ORDER BY id',
        [facture_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur getLines:', error);
      throw error;
    }
  }

  /**
   * Ajouter une ligne à une facture
   */
  static async addLine(facture_id, data) {
    const { intervention_id, description, quantite, prix_unitaire } = data;
    
    try {
      const result = await query(
        `INSERT INTO lignes_facture 
        (facture_id, intervention_id, description, quantite, prix_unitaire)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [facture_id, intervention_id, description, quantite, prix_unitaire]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur addLine:', error);
      throw error;
    }
  }

  /**
   * Supprimer une ligne de facture
   */
  static async deleteLine(ligne_id) {
    try {
      await query('DELETE FROM lignes_facture WHERE id = $1', [ligne_id]);
      return true;
    } catch (error) {
      console.error('Erreur deleteLine:', error);
      throw error;
    }
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================

  /**
   * Statistiques de facturation
   */
  static async getStatistics(prestataire_id, annee = null) {
    try {
      let sql = `
        SELECT 
          COUNT(*) as total_factures,
          COUNT(*) FILTER (WHERE statut = 'payee') as factures_payees,
          COUNT(*) FILTER (WHERE statut IN ('emise', 'en_retard')) as factures_impayees,
          COALESCE(SUM(montant_ttc), 0) as montant_total,
          COALESCE(SUM(montant_ttc) FILTER (WHERE statut = 'payee'), 0) as montant_paye,
          COALESCE(SUM(montant_ttc) FILTER (WHERE statut IN ('emise', 'en_retard')), 0) as montant_impaye
        FROM factures 
        WHERE prestataire_id = $1
      `;
      const params = [prestataire_id];

      if (annee) {
        sql += ` AND EXTRACT(YEAR FROM date_emission) = $2`;
        params.push(annee);
      }

      const result = await query(sql, params);
      return result.rows[0];
    } catch (error) {
      console.error('Erreur getStatistics:', error);
      throw error;
    }
  }

  /**
   * Vérifier si une facture appartient à un prestataire
   */
  static async belongsToPrestataire(facture_id, prestataire_id) {
    try {
      const result = await query(
        'SELECT id FROM factures WHERE id = $1 AND prestataire_id = $2',
        [facture_id, prestataire_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Erreur belongsToPrestataire:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour le chemin du PDF
   */
  static async updatePdfPath(id, chemin_pdf) {
    try {
      const result = await query(
        'UPDATE factures SET chemin_pdf = $1 WHERE id = $2 RETURNING *',
        [chemin_pdf, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur updatePdfPath:', error);
      throw error;
    }
  }
}

module.exports = Facture;
// ============================================================
// src/models/Prestataire.js  — VERSION CONSOLIDÉE
// ============================================================

const { pool, query } = require('../config/database');
const bcrypt = require('bcrypt');

class Prestataire {

  // ============================================================
  // LECTURE
  // ============================================================

  /**
   * Trouver par ID — sans le mot de passe (usage général)
   */
  static async findById(id) {
    try {
      const result = await pool.query(
        `SELECT id, email, nom, prenom, telephone, siret,
                adresse, ville, code_postal, statut_actif, derniere_connexion, date_creation,
                notif_intervention, notif_rappel, notif_paiement, notif_retard
         FROM prestataires
         WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findById:', error);
      throw error;
    }
  }

  /**
   * Trouver par ID AVEC le mot de passe — uniquement pour vérification mdp
   */
  static async findByIdWithPassword(id) {
    try {
      const result = await pool.query(
        `SELECT id, email, mot_de_passe
         FROM prestataires
         WHERE id = $1`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findByIdWithPassword:', error);
      throw error;
    }
  }

  /**
   * Trouver par email (retourne aussi le mot de passe — pour l'auth Passport)
   */
  static async findByEmail(email) {
    try {
      const result = await pool.query(
        `SELECT * FROM prestataires WHERE email = $1`,
        [email]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur findByEmail:', error);
      throw error;
    }
  }

  /**
   * Tous les prestataires actifs
   */
  static async findAll() {
    try {
      const result = await pool.query(
        `SELECT id, email, nom, prenom, telephone, siret, ville, statut_actif, date_creation
         FROM prestataires
         ORDER BY date_creation DESC`
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur findAll:', error);
      throw error;
    }
  }

  // ============================================================
  // CRÉATION & MODIFICATION
  // ============================================================

  /**
   * Créer un nouveau prestataire
   */
  static async create(data) {
    const { email, mot_de_passe, nom, prenom, telephone, siret, adresse, ville, code_postal } = data;
    try {
      const existing = await this.findByEmail(email);
      if (existing) throw new Error('Cet email est déjà utilisé');

      const rounds         = parseInt(process.env.BCRYPT_ROUNDS) || 10;
      const hashedPassword = await bcrypt.hash(mot_de_passe, rounds);

      const result = await pool.query(
        `INSERT INTO prestataires
         (email, mot_de_passe, nom, prenom, telephone, siret, adresse, ville, code_postal)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, email, nom, prenom, telephone, siret, ville, code_postal, statut_actif, date_creation`,
        [email, hashedPassword, nom, prenom, telephone, siret, adresse, ville, code_postal]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Erreur create:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les infos du profil
   */
  static async update(id, data) {
    const { nom, prenom, telephone, siret, adresse, ville, code_postal } = data;
    try {
      const result = await pool.query(
        `UPDATE prestataires
         SET nom = $1, prenom = $2, telephone = $3, siret = $4,
             adresse = $5, ville = $6, code_postal = $7
         WHERE id = $8
         RETURNING id, email, nom, prenom, telephone, siret, adresse, ville, code_postal`,
        [nom, prenom, telephone, siret, adresse, ville, code_postal, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur update:', error);
      throw error;
    }
  }

  /**
   * Changer le mot de passe — reçoit le hash déjà calculé par le contrôleur
   */
  static async updatePassword(id, newHash) {
    try {
      await pool.query(
        `UPDATE prestataires SET mot_de_passe = $1 WHERE id = $2`,
        [newHash, id]
      );
      return true;
    } catch (error) {
      console.error('Erreur updatePassword:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour les préférences de notifications
   */
  static async updateNotifications(id, prefs) {
    try {
      const result = await pool.query(
        `UPDATE prestataires
         SET notif_intervention = $1,
             notif_rappel       = $2,
             notif_paiement     = $3,
             notif_retard       = $4
         WHERE id = $5
         RETURNING id, notif_intervention, notif_rappel, notif_paiement, notif_retard`,
        [prefs.notif_intervention, prefs.notif_rappel, prefs.notif_paiement, prefs.notif_retard, id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur updateNotifications:', error);
      throw error;
    }
  }

  /**
   * Vérifier un mot de passe en clair contre un hash
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Erreur verifyPassword:', error);
      return false;
    }
  }

  /**
   * Mettre à jour la dernière connexion
   */
  static async updateLastLogin(id) {
    try {
      await pool.query(
        `UPDATE prestataires SET derniere_connexion = NOW() WHERE id = $1`,
        [id]
      );
      return true;
    } catch (error) {
      console.error('Erreur updateLastLogin:', error);
      throw error;
    }
  }

  // ============================================================
  // GESTION DU STATUT
  // ============================================================

  static async deactivate(id) {
    try {
      const result = await pool.query(
        `UPDATE prestataires SET statut_actif = false WHERE id = $1 RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur deactivate:', error);
      throw error;
    }
  }

  static async activate(id) {
    try {
      const result = await pool.query(
        `UPDATE prestataires SET statut_actif = true WHERE id = $1 RETURNING *`,
        [id]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Erreur activate:', error);
      throw error;
    }
  }

  // ============================================================
  // STATISTIQUES
  // ============================================================

  static async getStatistics(prestataire_id, dateDebut = null, dateFin = null) {
    try {
      if (!dateDebut || !dateFin) {
        const now = new Date();
        dateDebut = new Date(now.getFullYear(), now.getMonth(), 1);
        dateFin   = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      const clientsResult = await pool.query(
        `SELECT COUNT(*) as total FROM clients WHERE prestataire_id = $1 AND statut_actif = true`,
        [prestataire_id]
      );

      const interventionsResult = await pool.query(
        `SELECT
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE statut = 'effectuee') as effectuees,
           COUNT(*) FILTER (WHERE statut = 'planifiee') as planifiees,
           COALESCE(SUM(duree_minutes) FILTER (WHERE statut = 'effectuee'), 0) as minutes_totales
         FROM interventions
         WHERE prestataire_id = $1 AND date_intervention BETWEEN $2 AND $3`,
        [prestataire_id, dateDebut, dateFin]
      );

      const caResult = await pool.query(
        `SELECT COALESCE(SUM(montant_ttc), 0) as ca_total
         FROM factures
         WHERE prestataire_id = $1 AND date_emission BETWEEN $2 AND $3 AND statut != 'annulee'`,
        [prestataire_id, dateDebut, dateFin]
      );

      const impayesResult = await pool.query(
        `SELECT COUNT(*) as nombre, COALESCE(SUM(montant_ttc), 0) as montant
         FROM factures
         WHERE prestataire_id = $1 AND statut IN ('emise', 'en_retard')`,
        [prestataire_id]
      );

      return {
        clients_actifs: parseInt(clientsResult.rows[0].total),
        interventions: {
          total:         parseInt(interventionsResult.rows[0].total),
          effectuees:    parseInt(interventionsResult.rows[0].effectuees),
          planifiees:    parseInt(interventionsResult.rows[0].planifiees),
          heures_totales: Math.round(parseInt(interventionsResult.rows[0].minutes_totales) / 60 * 10) / 10
        },
        chiffre_affaires: parseFloat(caResult.rows[0].ca_total),
        factures_impayees: {
          nombre:  parseInt(impayesResult.rows[0].nombre),
          montant: parseFloat(impayesResult.rows[0].montant)
        }
      };
    } catch (error) {
      console.error('Erreur getStatistics:', error);
      throw error;
    }
  }

  static async getMonthlyEvolution(prestataire_id) {
    try {
      const result = await pool.query(
        `SELECT
           TO_CHAR(date_intervention, 'YYYY-MM') as mois,
           COUNT(*) FILTER (WHERE statut = 'effectuee') as interventions,
           COALESCE(SUM(duree_minutes) FILTER (WHERE statut = 'effectuee'), 0) / 60.0 as heures
         FROM interventions
         WHERE prestataire_id = $1
           AND date_intervention >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY TO_CHAR(date_intervention, 'YYYY-MM')
         ORDER BY mois`,
        [prestataire_id]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur getMonthlyEvolution:', error);
      throw error;
    }
  }
}

module.exports = Prestataire;
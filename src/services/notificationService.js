// ============================================================
// SERVICE NOTIFICATIONS AUTOMATIQUES
// ============================================================

const Intervention   = require('../models/InterventionModel');
const Client         = require('../models/Client');
const TypeService    = require('../models/TypeService');
const EmailService   = require('./emailService');
const Notification   = require('../models/Notification');
const PDFService     = require('./pdfService');
const Facture        = require('../models/Facture');
const Prestataire    = require('../models/Prestataire');

class NotificationService {

  // ─────────────────────────────────────────────────────────────
  // Rappels 24h avant intervention
  // ─────────────────────────────────────────────────────────────
  static async sendTomorrowReminders() {
    try {
      console.log('🔔 Vérification des rappels à envoyer...');

      const tomorrow    = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const interventions = await this.getInterventionsForDate(tomorrowStr);
      console.log(`📅 ${interventions.length} intervention(s) trouvée(s) pour demain`);

      let sent = 0, errors = 0;

      for (const intervention of interventions) {
        try {
          const client = await Client.findById(intervention.client_id);

          if (!client.email) {
            console.log(`⚠️ Client ${client.prenom} ${client.nom} sans email, rappel ignoré`);
            continue;
          }

          const typeService = await TypeService.findById(intervention.type_service_id);
          await EmailService.sendReminderEmail(client, intervention, typeService);

          await Notification.create({
            prestataire_id: intervention.prestataire_id,
            client_id:      intervention.client_id,
            type:           'rappel_intervention',
            titre:          'Rappel envoyé',
            message:        `Rappel envoyé pour l'intervention du ${new Date(intervention.date_intervention).toLocaleDateString('fr-FR')}`,
            lien:           '/interventions'
          });

          sent++;
          console.log(`✅ Rappel envoyé à ${client.email}`);

        } catch (error) {
          errors++;
          console.error(`❌ Erreur rappel intervention ${intervention.id}:`, error.message);
        }
      }

      console.log(`📊 Résultat: ${sent} envoyés, ${errors} erreurs`);
      return { sent, errors };

    } catch (error) {
      console.error('❌ Erreur sendTomorrowReminders:', error);
      return { sent: 0, errors: 1 };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Interventions pour une date donnée
  // ─────────────────────────────────────────────────────────────
  static async getInterventionsForDate(dateStr) {
    try {
      const { query } = require('../config/database');
      const result = await query(
        `SELECT i.*,
          c.email as client_email,
          ts.nom as type_service_nom
        FROM interventions i
        JOIN clients c ON i.client_id = c.id
        JOIN types_service ts ON i.type_service_id = ts.id
        WHERE i.date_intervention::date = $1
          AND i.statut = 'planifiee'
        ORDER BY i.heure_debut`,
        [dateStr]
      );
      return result.rows;
    } catch (error) {
      console.error('Erreur getInterventionsForDate:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Notification nouvelle facture
  // → Génère le PDF en mémoire pour l'envoi email (Render safe)
  // ─────────────────────────────────────────────────────────────
  static async notifyNewFacture(facture, client) {
    try {
      await Notification.create({
        prestataire_id: facture.prestataire_id,
        client_id:      facture.client_id,
        type:           'facture_emise',
        titre:          'Nouvelle facture',
        message:        `Facture ${facture.numero_facture} - ${facture.montant_ttc}€`,
        lien:           `/factures/${facture.id}`
      });

      if (client.email) {
        const lignes      = await Facture.getLines(facture.id);
        const prestataire = await Prestataire.findById(facture.prestataire_id);

        // Génération en mémoire — pas de dépendance au disque
        const pdfBuffer = await PDFService.generateFacturePDFBuffer(facture, lignes, prestataire, client);
        await EmailService.sendFactureEmail(client, facture, pdfBuffer);
      }

      return true;
    } catch (error) {
      console.error('Erreur notifyNewFacture:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Mise à jour des factures en retard
  // ─────────────────────────────────────────────────────────────
  static async updateOverdueInvoices() {
    try {
      console.log('🔔 Mise à jour des factures en retard...');
      const { query } = require('../config/database');
      const result = await query(
        `UPDATE factures
        SET statut = 'en_retard'
        WHERE statut = 'emise'
          AND date_echeance < CURRENT_DATE
        RETURNING *`
      );
      console.log(`📊 ${result.rows.length} facture(s) marquée(s) en retard`);
      return result.rows;
    } catch (error) {
      console.error('Erreur updateOverdueInvoices:', error);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Nettoyage des anciennes notifications
  // ─────────────────────────────────────────────────────────────
  static async cleanOldNotifications(days = 30) {
    try {
      await Notification.deleteOld(days);
      console.log(`🧹 Notifications de plus de ${days} jours supprimées`);
      return true;
    } catch (error) {
      console.error('Erreur cleanOldNotifications:', error);
      return false;
    }
  }
}

module.exports = NotificationService;
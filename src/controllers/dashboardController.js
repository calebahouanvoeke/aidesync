// ============================================================
// CONTRÔLEUR TABLEAU DE BORD
// ============================================================

const Prestataire = require('../models/Prestataire');
const Client = require('../models/Client');
const Intervention = require('../models/InterventionModel');
const Facture = require('../models/Facture');
const { query } = require('../config/database');

/**
 * Calculer les stats directement en SQL pour éviter les bugs du modèle
 */
async function getStatsDirectes(prestataireId) {
  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const finMois   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Formatter en local (évite le décalage UTC)
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Clients actifs
  const clientsRes = await query(
    `SELECT COUNT(*) as count FROM clients WHERE prestataire_id = $1 AND statut_actif = true`,
    [prestataireId]
  );

  // Interventions du mois — total hors annulées
  const intRes = await query(
    `SELECT COUNT(*) as count FROM interventions 
     WHERE prestataire_id = $1 
       AND date_intervention >= $2 
       AND date_intervention <= $3
       AND statut != 'annulee'`,
    [prestataireId, fmt(debutMois), fmt(finMois)]
  );

  // Interventions du mois — par statut
  const intParStatutRes = await query(
    `SELECT statut, COUNT(*) as count FROM interventions
     WHERE prestataire_id = $1
       AND date_intervention >= $2
       AND date_intervention <= $3
     GROUP BY statut`,
    [prestataireId, fmt(debutMois), fmt(finMois)]
  );

  // Indexer les résultats par statut
  const parStatut = {};
  (intParStatutRes.rows || []).forEach(r => { parStatut[r.statut] = parseInt(r.count); });
  const nbEffectuees = parStatut['effectuee'] || 0;
  const nbPlanifiees = parStatut['planifiee'] || 0;
  const nbAnnulees   = parStatut['annulee']   || 0;
  const nbTotal      = nbEffectuees + nbPlanifiees + nbAnnulees;

  // CA du mois (factures payées ce mois)
  const caRes = await query(
    `SELECT COALESCE(SUM(montant_ttc), 0) as total FROM factures
     WHERE prestataire_id = $1
       AND statut = 'payee'
       AND EXTRACT(MONTH FROM date_paiement) = $2
       AND EXTRACT(YEAR FROM date_paiement) = $3`,
    [prestataireId, now.getMonth() + 1, now.getFullYear()]
  );

  return {
    clients_actifs:             parseInt(clientsRes.rows[0]?.count || 0),
    interventions_mois:         nbTotal,
    interventions_effectuees:   nbEffectuees,
    interventions_planifiees:   nbPlanifiees,
    interventions_annulees:     nbAnnulees,
    ca_mois:                    parseFloat(caRes.rows[0]?.total || 0),
  };
}

/**
 * Afficher le tableau de bord
 */
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;

    // Stats calculées directement (fiables)
    const stats = await getStatsDirectes(prestataireId);

    // Interventions d'aujourd'hui (heure locale)
    const interventionsAujourdhui = await Intervention.findTodayInterventions(prestataireId);

    // Prochaines interventions
    const prochainesInterventions = await Intervention.findUpcoming(prestataireId, 8);

    // Factures en retard
    const facturesEnRetard = await Facture.findOverdue(prestataireId);

    // Paiements à valider
    const paiementsAValider = await Facture.findPendingPaymentValidation(prestataireId);

    res.render('pages/dashboard/index', {
      title: 'Tableau de bord - AideSync',
      stats,
      interventionsAujourdhui,
      prochainesInterventions,
      facturesEnRetard,
      paiementsAValider,
      currentPage: 'dashboard'
    });

  } catch (error) {
    console.error('Erreur dashboard:', error);
    req.flash('error', 'Erreur lors du chargement du tableau de bord');
    res.redirect('/auth/login');
  }
};

/**
 * API stats en temps réel (appelée par le JS toutes les 60s)
 */
exports.getStats = async (req, res) => {
  try {
    const stats = await getStatsDirectes(req.user.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Erreur getStats:', error);
    res.status(500).json({ success: false });
  }
};
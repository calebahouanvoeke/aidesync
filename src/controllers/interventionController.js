// ============================================================
// CONTRÔLEUR INTERVENTIONS
// ============================================================

const Intervention = require('../models/InterventionModel');
const Client = require('../models/Client');
const TypeService = require('../models/TypeService');
const EmailService = require('../services/emailService');

/**
 * Afficher le planning
 */
exports.index = async (req, res) => {
  try {
    const prestataireId = req.user.id;

    let startOfWeek, endOfWeek;

    if (req.query.start && req.query.end) {
      // Dates venant de l'URL — parser en local (jamais new Date('YYYY-MM-DD') qui est UTC)
      const [sy, sm, sd] = req.query.start.split('-').map(Number);
      const [ey, em, ed] = req.query.end.split('-').map(Number);
      startOfWeek = new Date(sy, sm - 1, sd, 0, 0, 0, 0);
      endOfWeek   = new Date(ey, em - 1, ed, 23, 59, 59, 999);
    } else {
      // Pas de dates en query : on redirige vers le navigateur pour qu'il calcule
      // la vraie date locale (le serveur peut être en UTC)
      return res.render('pages/interventions/redirect', {
        title: 'Planning - AideSync',
        currentPage: 'planning'
      });
    }

    const toLocalDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const j = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${j}`;
    };

    const interventions = await Intervention.findByPrestataire(
      prestataireId,
      toLocalDate(startOfWeek),
      toLocalDate(endOfWeek)
    );
console.log('Interventions récupérées:', JSON.stringify(interventions, null, 2));
    res.render('pages/interventions/index', {
      title: 'Planning - AideSync',
      interventions,
      startOfWeek,
      endOfWeek,
      currentPage: 'planning'
    });

  } catch (error) {
    console.error('Erreur planning:', error);
    req.flash('error', 'Erreur lors du chargement du planning');
    res.redirect('/dashboard');
  }
};

/**
 * Afficher le formulaire de création
 */
exports.create = async (req, res) => {
  try {
    const prestataireId = req.user.id;
    
    const clients = await Client.findByPrestataire(prestataireId);
    const typesService = await TypeService.findAll();

    // Récupérer le client_id depuis l'URL (?client_id=2)
    const flashData = req.flash('formData')[0] || {};
    const preselectedClientId = req.query.client_id || flashData.client_id;

    res.render('pages/interventions/create', {
      title: 'Nouvelle intervention - AideSync',
      clients,
      typesService,
      errors: req.flash('error'),
      formData: {
        ...flashData,
        client_id: preselectedClientId
      },
      currentPage: 'planning'
    });

  } catch (error) {
    console.error('Erreur formulaire intervention:', error);
    req.flash('error', 'Erreur lors du chargement du formulaire');
    res.redirect('/interventions');
  }
};

/**
 * Enregistrer une intervention
 */
exports.store = async (req, res) => {
  try {
    const prestataireId = req.user.id;

    // Créer l'intervention
    const intervention = await Intervention.create({
      prestataire_id: prestataireId,
      client_id: parseInt(req.body.client_id),
      type_service_id: parseInt(req.body.type_service_id),
      date_intervention: req.body.date_intervention,
      heure_debut: req.body.heure_debut,
      heure_fin: req.body.heure_fin,
      notes_prestataire: req.body.notes_prestataire || null
    });

    // Récupérer les infos pour l'email
    const client = await Client.findById(req.body.client_id);
    const typeService = await TypeService.findById(req.body.type_service_id);
    
    // Envoyer l'email si le client a un email
    if (client.email) {
      await EmailService.sendInterventionNotification(client, intervention, typeService);
    }

    req.flash('success', 'Intervention créée avec succès');
    res.redirect('/interventions');

  } catch (error) {
    console.error('Erreur création intervention:', error);
    req.flash('error', error.message || 'Erreur lors de la création de l\'intervention');
    req.flash('formData', JSON.stringify(req.body));
    res.redirect('/interventions/create');
  }
};

/**
 * Marquer une intervention comme effectuée
 */
exports.markAsDone = async (req, res) => {
  try {
    const interventionId = req.params.id;
    const prestataireId = req.user.id;

    // Vérifier que l'intervention appartient au prestataire
    const belongs = await Intervention.belongsToPrestataire(interventionId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ 
        success: false, 
        message: 'Intervention introuvable' 
      });
    }

    // Marquer comme effectuée
    await Intervention.markAsDone(interventionId);

    res.json({ 
      success: true, 
      message: 'Intervention marquée comme effectuée' 
    });

  } catch (error) {
    console.error('Erreur markAsDone:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour' 
    });
  }
};

/**
 * Supprimer une intervention
 */
exports.destroy = async (req, res) => {
  try {
    const interventionId = req.params.id;
    const prestataireId = req.user.id;

    // Vérifier que l'intervention appartient au prestataire
    const belongs = await Intervention.belongsToPrestataire(interventionId, prestataireId);
    if (!belongs) {
      return res.status(404).json({ 
        success: false, 
        message: 'Intervention introuvable' 
      });
    }

    // Supprimer l'intervention
    await Intervention.delete(interventionId);

    req.flash('success', 'Intervention supprimée avec succès');
    res.json({ success: true });

  } catch (error) {
    console.error('Erreur suppression intervention:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression' 
    });
  }
};
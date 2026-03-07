// ============================================================
// TÂCHES PLANIFIÉES (CRON)
// ============================================================

require('dotenv').config();
const NotificationService = require('../services/notificationService');

/**
 * Tâche quotidienne : Envoyer les rappels et mettre à jour les statuts
 */
async function dailyTasks() {
  console.log('\n========================================');
  console.log('🕐 TÂCHES QUOTIDIENNES - ' + new Date().toLocaleString('fr-FR'));
  console.log('========================================\n');
  
  try {
    // 1. Envoyer les rappels pour demain
    console.log('📧 1. Envoi des rappels d\'intervention...');
    await NotificationService.sendTomorrowReminders();
    
    // 2. Mettre à jour les factures en retard
    console.log('\n💰 2. Mise à jour des factures en retard...');
    await NotificationService.updateOverdueInvoices();
    
    // 3. Nettoyer les anciennes notifications
    console.log('\n🧹 3. Nettoyage des anciennes notifications...');
    await NotificationService.cleanOldNotifications(30);
    
    console.log('\n✅ Tâches quotidiennes terminées !\n');
    
  } catch (error) {
    console.error('\n❌ Erreur lors des tâches quotidiennes:', error);
  }
}

/**
 * Exécuter les tâches immédiatement (pour test)
 */
async function runNow() {
  await dailyTasks();
  process.exit(0);
}

// Si le script est exécuté directement
if (require.main === module) {
  runNow();
}

module.exports = { dailyTasks };
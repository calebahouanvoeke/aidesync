// Fichier JavaScript personnalisé AideSync
console.log('AideSync chargé !');

// Auto-dismiss des alertes après 5 secondes
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(() => {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    });
  }, 5000);
});
// ============================================================
// SERVICE ENVOI D'EMAILS
// ============================================================

const nodemailer = require('nodemailer');

class EmailService {

  static createTransporter() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Intervention planifiée
  // ─────────────────────────────────────────────────────────────
  static async sendInterventionNotification(client, intervention, typeService) {
    try {
      const transporter = this.createTransporter();
      const dateIntervention = new Date(intervention.date_intervention).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: client.email,
        subject: `Nouvelle intervention prévue le ${dateIntervention}`,
        html: `<!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .info-box{background:white;padding:20px;margin:20px 0;border-left:4px solid #667eea}
          .button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}
          .footer{text-align:center;color:#999;font-size:12px;margin-top:30px}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>&#127968; AideSync</h1><p>Notification d'intervention</p></div>
            <div class="content">
              <p>Bonjour ${client.prenom} ${client.nom},</p>
              <p>Une nouvelle intervention a &eacute;t&eacute; planifi&eacute;e pour vous :</p>
              <div class="info-box">
                <p><strong>&#128197; Date :</strong> ${dateIntervention}</p>
                <p><strong>&#128336; Horaire :</strong> ${intervention.heure_debut} - ${intervention.heure_fin}</p>
                <p><strong>&#128295; Service :</strong> ${typeService.nom}</p>
                ${intervention.notes_prestataire ? `<p><strong>&#128221; Notes :</strong> ${intervention.notes_prestataire}</p>` : ''}
              </div>
              <p>Vous pouvez consulter votre planning via votre espace personnel :</p>
              <center><a href="${process.env.APP_URL || 'http://localhost:3000'}/client/${client.lien_acces_securise}" class="button">Acc&eacute;der &agrave; mon espace</a></center>
              <p>&Agrave; bient&ocirc;t !</p>
              <div class="footer"><p>Cet email a &eacute;t&eacute; envoy&eacute; automatiquement par AideSync</p></div>
            </div>
          </div>
        </body></html>`
      };
      await transporter.sendMail(mailOptions);
      console.log('✅ Email intervention envoyé à:', client.email);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email intervention:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Rappel 24h
  // ─────────────────────────────────────────────────────────────
  static async sendReminderEmail(client, intervention, typeService) {
    try {
      const transporter = this.createTransporter();
      const dateIntervention = new Date(intervention.date_intervention).toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long'
      });
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: client.email,
        subject: `⏰ Rappel : Intervention demain à ${intervention.heure_debut}`,
        html: `<!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333;font-size:16px}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .reminder-box{background:#fff3cd;border:2px solid #ffc107;padding:20px;margin:20px 0;border-radius:5px}
          .big-time{font-size:32px;font-weight:bold;color:#667eea}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>&#9200; Rappel d'intervention</h1></div>
            <div class="content">
              <p style="font-size:18px">Bonjour ${client.prenom},</p>
              <div class="reminder-box"><p style="font-size:20px;margin:0"><strong>Votre intervention est pr&eacute;vue demain !</strong></p></div>
              <p><strong>&#128197; Date :</strong> ${dateIntervention}</p>
              <p class="big-time">&#128336; ${intervention.heure_debut} - ${intervention.heure_fin}</p>
              <p><strong>&#128295; Service :</strong> ${typeService.nom}</p>
              ${client.code_acces ? `<p><strong>&#128273; Code d'acc&egrave;s :</strong> ${client.code_acces}</p>` : ''}
              <p style="margin-top:30px">&Agrave; demain !</p>
            </div>
          </div>
        </body></html>`
      };
      await transporter.sendMail(mailOptions);
      console.log('✅ Email rappel envoyé à:', client.email);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email rappel:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Envoi facture PDF en pièce jointe (bouton manuel)
  // ─────────────────────────────────────────────────────────────
  static async sendFactureEmail(client, facture, pdfPath) {
    try {
      const transporter = this.createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: client.email,
        subject: `Facture ${facture.numero_facture} - AideSync`,
        html: `<!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .facture-box{background:white;padding:20px;margin:20px 0;border:2px solid #667eea;border-radius:5px}
          .amount{font-size:28px;font-weight:bold;color:#667eea}
          .button{display:inline-block;background:#667eea;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>&#128196; Facture AideSync</h1></div>
            <div class="content">
              <p>Bonjour ${client.prenom} ${client.nom},</p>
              <p>Veuillez trouver ci-joint votre facture :</p>
              <div class="facture-box">
                <p><strong>Num&eacute;ro :</strong> ${facture.numero_facture}</p>
                <p><strong>P&eacute;riode :</strong> ${new Date(facture.periode_debut).toLocaleDateString('fr-FR', { month:'long', year:'numeric' })}</p>
                <p><strong>Date d'&eacute;ch&eacute;ance :</strong> ${new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</p>
                <p class="amount">Montant : ${facture.montant_ttc}&euro;</p>
              </div>
              <center><a href="${process.env.APP_URL || 'http://localhost:3000'}/client/${client.lien_acces_securise}/factures" class="button">Voir mes factures</a></center>
              <p>Cordialement,</p>
            </div>
          </div>
        </body></html>`,
        attachments: pdfPath ? [{ filename: `facture-${facture.numero_facture}.pdf`, path: pdfPath }] : []
      };
      await transporter.sendMail(mailOptions);
      console.log('✅ Email facture envoyé à:', client.email);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email facture:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Prestataire notifié qu'un client déclare un paiement
  // ─────────────────────────────────────────────────────────────
  static async notifyPaymentDeclared(prestataire, client, facture) {
    try {
      const transporter = this.createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: prestataire.email,
        subject: `🔔 ${client.prenom} ${client.nom} a déclaré un paiement`,
        html: `<!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:#17a2b8;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
          .info-box{background:white;padding:20px;margin:20px 0;border-left:4px solid #17a2b8}
          .button{display:inline-block;background:#28a745;color:white;padding:12px 30px;text-decoration:none;border-radius:5px;margin:20px 0}
          .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>&#128276; Paiement d&eacute;clar&eacute;</h1></div>
            <div class="content">
              <p>Bonjour,</p>
              <p><strong>${client.prenom} ${client.nom}</strong> vient de d&eacute;clarer avoir pay&eacute; une facture :</p>
              <div class="info-box">
                <p><strong>&#128196; Facture :</strong> ${facture.numero_facture}</p>
                <p><strong>&#128176; Montant :</strong> ${facture.montant_ttc}&euro;</p>
                <p><strong>&#128179; M&eacute;thode :</strong> ${facture.methode_paiement_declaree || 'Non pr&eacute;cis&eacute;e'}</p>
                ${facture.notes_paiement ? `<p><strong>&#128221; Notes :</strong> ${facture.notes_paiement}</p>` : ''}
              </div>
              <div class="warning"><strong>&#9888;&#65039; Action requise :</strong>
                <ol>
                  <li>V&eacute;rifiez votre compte bancaire</li>
                  <li>Validez le paiement dans AideSync pour notifier le client</li>
                </ol>
              </div>
              <center><a href="${process.env.APP_URL || 'http://localhost:3000'}/dashboard" class="button">Voir et valider le paiement</a></center>
            </div>
          </div>
        </body></html>`,
        attachments: facture.preuve_paiement_path ? [{
          filename: `preuve-paiement-${facture.numero_facture}${require('path').extname(facture.preuve_paiement_path)}`,
          path: require('path').join(__dirname, '../../public', facture.preuve_paiement_path)
        }] : []
      };
      await transporter.sendMail(mailOptions);
      console.log('✅ Email notification paiement déclaré envoyé à:', prestataire.email);
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email notification:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Client notifié que son paiement est invalidé
  // ─────────────────────────────────────────────────────────────
  static async notifyPaymentInvalidated(client, facture, raison) {
    try {
      const transporter = this.createTransporter();
      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: client.email,
        subject: `⚠️ Problème avec votre paiement - Facture ${facture.numero_facture}`,
        html: `<!DOCTYPE html><html><head><style>
          body{font-family:Arial,sans-serif;line-height:1.6;color:#333}
          .container{max-width:600px;margin:0 auto;padding:20px}
          .header{background:#dc3545;color:white;padding:30px;text-align:center;border-radius:10px 10px 0 0}
          .content{background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px}
        </style></head><body>
          <div class="container">
            <div class="header"><h1>&#9888;&#65039; Paiement non valid&eacute;</h1></div>
            <div class="content">
              <p>Bonjour ${client.prenom},</p>
              <p>Votre d&eacute;claration de paiement pour la facture <strong>${facture.numero_facture}</strong> n'a pas pu &ecirc;tre valid&eacute;e.</p>
              <p><strong>Raison :</strong> ${raison}</p>
              <p>Merci de v&eacute;rifier et de contacter directement votre prestataire.</p>
            </div>
          </div>
        </body></html>`
      };
      await transporter.sendMail(mailOptions);
      console.log('✅ Email invalidation paiement envoyé');
      return true;
    } catch (error) {
      console.error('❌ Erreur envoi email invalidation:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU — Notifier TOUS les clients concernés lors de la
  //           génération des factures du mois (generateMonthly)
  // ─────────────────────────────────────────────────────────────
  static async sendNouvellesFacturesEmail(client, factures, prestataire) {
    try {
      if (!client.email) {
        console.warn(`⚠️  Client ${client.prenom} ${client.nom} sans email — notification ignorée`);
        return false;
      }

      const transporter  = this.createTransporter();
      const appUrl       = process.env.APP_URL || 'http://localhost:3000';
      const lienEspace   = `${appUrl}/client/${client.lien_acces_securise}`;
      const total        = factures.reduce((s, f) => s + parseFloat(f.montant_ttc || 0), 0);
      const nbLabel      = factures.length > 1 ? `${factures.length} nouvelles factures` : 'une nouvelle facture';

      const rowsHtml = factures.map(f => {
        const d   = new Date(f.date_echeance);
        const ech = new Date(d.getFullYear(), d.getMonth(), d.getDate())
          .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
        return `
          <tr>
            <td style="padding:12px 16px;font-family:monospace;font-size:14px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">${f.numero_facture}</td>
            <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#1e293b;border-bottom:1px solid #f3f4f6;">${parseFloat(f.montant_ttc).toFixed(2)}&nbsp;&euro;</td>
            <td style="padding:12px 16px;font-size:13px;color:#dc2626;border-bottom:1px solid #f3f4f6;">avant le ${ech}</td>
          </tr>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Nouvelles factures - AideSync</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- EN-TÊTE VIOLET -->
    <tr><td style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
      <div style="display:inline-block;background:rgba(255,255,255,.18);border-radius:14px;padding:10px 22px;margin-bottom:18px;">
        <span style="color:#fff;font-size:20px;font-weight:900;">&#10084; AideSync</span>
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Votre facture est disponible</h1>
      <p style="color:rgba(255,255,255,.8);font-size:14px;margin:0;">
        ${prestataire.prenom} ${prestataire.nom} vous a adress&eacute; ${nbLabel} ce mois-ci.
      </p>
    </td></tr>

    <!-- CORPS -->
    <tr><td style="background:#fff;padding:36px 40px;">

      <p style="font-size:16px;color:#1e293b;font-weight:700;margin:0 0 6px;">Bonjour ${client.prenom},</p>
      <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 24px;">
        Voici le r&eacute;capitulatif de vos interventions du mois &eacute;coul&eacute;.
        Merci de proc&eacute;der au r&egrave;glement avant les dates indiqu&eacute;es.
      </p>

      <!-- TABLEAU FACTURES -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;border-bottom:1px solid #e2e8f0;">N&deg; Facture</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;border-bottom:1px solid #e2e8f0;">Montant TTC</th>
            <th style="padding:10px 16px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;font-weight:700;border-bottom:1px solid #e2e8f0;">R&eacute;gler</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
        <tfoot>
          <tr style="background:#f8fafc;">
            <td colspan="2" style="padding:12px 16px;font-size:13px;font-weight:800;color:#1e293b;border-top:2px solid #e2e8f0;">Total &agrave; r&eacute;gler</td>
            <td style="padding:12px 16px;font-size:17px;font-weight:900;color:#667eea;border-top:2px solid #e2e8f0;">${total.toFixed(2)}&nbsp;&euro;</td>
          </tr>
        </tfoot>
      </table>

      <!-- INFO PAIEMENT -->
      <div style="background:#f0f4ff;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
        <p style="font-size:13px;font-weight:700;color:#1e293b;margin:0 0 6px;">
          &#8505;&#65039;&nbsp; Modes de paiement accept&eacute;s
        </p>
        <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0;">
          Virement bancaire &bull; Esp&egrave;ces &bull; Ch&egrave;que<br>
          Une fois votre paiement effectu&eacute;, d&eacute;clarez-le depuis votre espace client.
        </p>
      </div>

      <!-- BOUTON CTA -->
      <div style="text-align:center;margin-bottom:24px;">
        <a href="${lienEspace}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:10px;">
          Acc&eacute;der &agrave; mon espace client
        </a>
        <p style="font-size:12px;color:#94a3b8;margin:10px 0 0;">
          T&eacute;l&eacute;chargez vos factures et d&eacute;clarez vos paiements en ligne
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 18px;">
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;text-align:center;">
        Email envoy&eacute; par <strong>${prestataire.prenom} ${prestataire.nom}</strong> via AideSync.<br>
        Pour toute question, contactez directement votre prestataire.
      </p>

    </td></tr>

    <!-- PIED DE PAGE -->
    <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;border-top:1px solid #f1f5f9;">
      <span style="font-size:11px;color:#cbd5e1;">AideSync &bull; Plateforme de gestion des services &agrave; la personne</span>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      client.email,
        subject: `[AideSync] ${nbLabel.charAt(0).toUpperCase() + nbLabel.slice(1)} — ${total.toFixed(2)} € à régler`,
        html
      });

      console.log(`✅ Email nouvelles factures envoyé à: ${client.email}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur envoi email nouvelles factures:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU — Confirmer au client que son paiement est validé
  //           par le prestataire (markAsPaid)
  // ─────────────────────────────────────────────────────────────
  static async sendPaiementConfirmeEmail(client, facture, prestataire) {
    try {
      if (!client.email) {
        console.warn(`⚠️  Client ${client.prenom} ${client.nom} sans email — confirmation ignorée`);
        return false;
      }

      const transporter = this.createTransporter();

      const rawEmission   = new Date(facture.date_emission);
      const dateEmission  = new Date(rawEmission.getFullYear(), rawEmission.getMonth(), rawEmission.getDate())
        .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      const aujourdhuiStr = new Date().toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
      });

      const modePaiement  = facture.mode_paiement
        ? facture.mode_paiement.charAt(0).toUpperCase() + facture.mode_paiement.slice(1).replace('_', ' ')
        : null;

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Paiement confirm&eacute; - AideSync</title>
</head>
<body style="margin:0;padding:0;background:#f0fff4;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fff4;padding:40px 20px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- EN-TÊTE VERT -->
    <tr><td style="background:linear-gradient(135deg,#11998e,#38ef7d);border-radius:16px 16px 0 0;padding:40px 40px 32px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,255,255,.25);border-radius:50%;margin:0 auto 18px;text-align:center;line-height:64px;font-size:30px;">
        &#10003;
      </div>
      <h1 style="color:#fff;font-size:24px;font-weight:800;margin:0 0 8px;">Paiement confirm&eacute; !</h1>
      <p style="color:rgba(255,255,255,.85);font-size:14px;margin:0;">
        Votre r&egrave;glement a bien &eacute;t&eacute; re&ccedil;u et valid&eacute;
      </p>
    </td></tr>

    <!-- CORPS -->
    <tr><td style="background:#fff;padding:36px 40px;">

      <p style="font-size:16px;color:#1e293b;font-weight:700;margin:0 0 6px;">Bonjour ${client.prenom},</p>
      <p style="font-size:14px;color:#64748b;line-height:1.7;margin:0 0 24px;">
        <strong>${prestataire.prenom} ${prestataire.nom}</strong> a confirm&eacute; la r&eacute;ception de votre paiement.
        Votre compte est &agrave; jour, merci pour votre confiance !
      </p>

      <!-- CARTE FACTURE PAYÉE -->
      <div style="background:#f0fff4;border:1.5px solid #bbf7d0;border-radius:14px;padding:24px 28px;margin-bottom:24px;">

        <div style="text-align:right;margin-bottom:14px;">
          <span style="background:#dcfce7;color:#16a34a;font-size:12px;font-weight:700;padding:4px 14px;border-radius:20px;">
            &#10003; Pay&eacute;e
          </span>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;vertical-align:top;">
              <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:2px;">N&deg; Facture</span>
              <span style="font-size:15px;font-weight:700;color:#1e293b;font-family:monospace;">${facture.numero_facture}</span>
            </td>
            <td style="padding:4px 0;text-align:right;vertical-align:top;">
              <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;display:block;margin-bottom:2px;">Montant r&eacute;gl&eacute;</span>
              <span style="font-size:22px;font-weight:900;color:#16a34a;">${parseFloat(facture.montant_ttc).toFixed(2)}&nbsp;&euro;</span>
            </td>
          </tr>
        </table>

        <hr style="border:none;border-top:1px solid #bbf7d0;margin:14px 0;">

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:12px;color:#64748b;padding:3px 0;">Date d'&eacute;mission</td>
            <td style="font-size:12px;color:#475569;text-align:right;padding:3px 0;">${dateEmission}</td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#64748b;padding:3px 0;">Confirm&eacute; le</td>
            <td style="font-size:12px;font-weight:700;color:#16a34a;text-align:right;padding:3px 0;">${aujourdhuiStr}</td>
          </tr>
          ${modePaiement ? `
          <tr>
            <td style="font-size:12px;color:#64748b;padding:3px 0;">Mode de paiement</td>
            <td style="font-size:12px;font-weight:600;color:#1e293b;text-align:right;padding:3px 0;">${modePaiement}</td>
          </tr>` : ''}
          <tr>
            <td style="font-size:12px;color:#64748b;padding:3px 0;">Prestataire</td>
            <td style="font-size:12px;font-weight:600;color:#1e293b;text-align:right;padding:3px 0;">${prestataire.prenom} ${prestataire.nom}</td>
          </tr>
        </table>
      </div>

      <!-- MESSAGE -->
      <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;margin-bottom:24px;text-align:center;">
        <p style="font-size:14px;color:#475569;line-height:1.7;margin:0;">
          Vous pouvez t&eacute;l&eacute;charger votre re&ccedil;u depuis votre espace client.
        </p>
      </div>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:0 0 18px;">
      <p style="font-size:12px;color:#94a3b8;line-height:1.6;margin:0;text-align:center;">
        Email envoy&eacute; par <strong>${prestataire.prenom} ${prestataire.nom}</strong> via AideSync.
      </p>

    </td></tr>

    <!-- PIED DE PAGE -->
    <tr><td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:18px 40px;text-align:center;border-top:1px solid #f1f5f9;">
      <span style="font-size:11px;color:#cbd5e1;">AideSync &bull; Plateforme de gestion des services &agrave; la personne</span>
    </td></tr>

  </table>
  </td></tr>
</table>
</body>
</html>`;

      await transporter.sendMail({
        from:    process.env.EMAIL_FROM,
        to:      client.email,
        subject: `[AideSync] Paiement confirmé — Facture ${facture.numero_facture}`,
        html
      });

      console.log(`✅ Email confirmation paiement envoyé à: ${client.email}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur envoi email confirmation paiement:', error);
      return false;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Test de config
  // ─────────────────────────────────────────────────────────────
  static async testEmailConfig() {
    try {
      const transporter = this.createTransporter();
      await transporter.verify();
      console.log('✅ Configuration email OK');
      return true;
    } catch (error) {
      console.error('❌ Erreur configuration email:', error);
      return false;
    }
  }
}

module.exports = EmailService;
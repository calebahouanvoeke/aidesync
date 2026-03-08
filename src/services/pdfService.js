// ============================================================
// SERVICE GÉNÉRATION PDF
// ============================================================

const PDFDocument = require('pdfkit');
const fs   = require('fs');
const path = require('path');

class PDFService {

  // ─────────────────────────────────────────────────────────────
  // NOUVEAU — Génère le PDF en mémoire (Buffer) sans toucher le disque
  // Utilisé pour l'envoi par email sur Render (filesystem éphémère)
  // ─────────────────────────────────────────────────────────────
  static async generateFacturePDFBuffer(facture, lignes, prestataire, client) {
    return new Promise((resolve, reject) => {
      try {
        const doc    = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks = [];

        doc.on('data',  chunk => chunks.push(chunk));
        doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        if (facture.statut === 'payee') this.addPaymentWatermark(doc);
        this.addHeader(doc, prestataire);
        this.addFactureInfo(doc, facture, client);
        this.addLignesTable(doc, lignes);
        this.addTotauxAvecStatut(doc, facture);
        this.addFooter(doc, prestataire);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // EXISTANT — Génère le PDF sur le disque (téléchargement direct)
  // ─────────────────────────────────────────────────────────────
  static async generateFacturePDF(facture, lignes, prestataire, client) {
    return new Promise((resolve, reject) => {
      try {
        const invoicesDir = path.join(__dirname, '../../public/invoices');
        if (!fs.existsSync(invoicesDir)) {
          fs.mkdirSync(invoicesDir, { recursive: true });
        }

        const filename = `facture-${facture.numero_facture}.pdf`;
        const filepath = path.join(invoicesDir, filename);

        const doc    = new PDFDocument({ size: 'A4', margin: 50 });
        const stream = fs.createWriteStream(filepath);
        doc.pipe(stream);

        if (facture.statut === 'payee') this.addPaymentWatermark(doc);
        this.addHeader(doc, prestataire);
        this.addFactureInfo(doc, facture, client);
        this.addLignesTable(doc, lignes);
        this.addTotauxAvecStatut(doc, facture);
        this.addFooter(doc, prestataire);

        doc.end();

        stream.on('finish', () => resolve(`/invoices/${filename}`));
        stream.on('error',  reject);

      } catch (error) {
        console.error('Erreur génération PDF:', error);
        reject(error);
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Filigrane "PAYÉE"
  // ─────────────────────────────────────────────────────────────
  static addPaymentWatermark(doc) {
    doc
      .save()
      .rotate(-45, { origin: [300, 400] })
      .fontSize(80)
      .fillColor('#28a745', 0.08)
      .text('PAYÉE', 50, 350, { width: 600, align: 'center' })
      .restore();
  }

  // ─────────────────────────────────────────────────────────────
  // En-tête
  // ─────────────────────────────────────────────────────────────
  static addHeader(doc, prestataire) {
    doc
      .fontSize(24).font('Helvetica-Bold').fillColor('#667eea').text('FACTURE', 50, 50)
      .fillColor('black').fontSize(10).font('Helvetica')
      .text(`${prestataire.prenom} ${prestataire.nom}`, 50, 85)
      .text(prestataire.adresse || '', 50, 100)
      .text(`${prestataire.code_postal || ''} ${prestataire.ville || ''}`, 50, 115)
      .text(`Tél: ${prestataire.telephone}`, 50, 130)
      .text(`Email: ${prestataire.email}`, 50, 145);

    if (prestataire.siret) {
      doc.text(`SIRET: ${prestataire.siret}`, 50, 160);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Infos facture + client
  // ─────────────────────────────────────────────────────────────
  static addFactureInfo(doc, facture, client) {
    doc
      .fontSize(12).font('Helvetica-Bold').fillColor('black')
      .text(`Facture N° ${facture.numero_facture}`, 350, 70, { width: 200, align: 'right' });

    const statusY = 95;
    let statusColor, statusText, textColor;

    if (facture.statut === 'payee') {
      statusColor = '#28a745'; statusText = '✓ PAYÉE';     textColor = 'white';
    } else if (facture.statut === 'en_retard') {
      statusColor = '#dc3545'; statusText = '✗ EN RETARD'; textColor = 'white';
    } else {
      statusColor = '#ffc107'; statusText = '○ EN ATTENTE'; textColor = 'black';
    }

    doc
      .roundedRect(410, statusY, 140, 28, 5).fillAndStroke(statusColor, statusColor)
      .fillColor(textColor).fontSize(12).font('Helvetica-Bold')
      .text(statusText, 410, statusY + 8, { width: 140, align: 'center' });

    let dateY = statusY + 45;
    doc.fillColor('black').fontSize(10).font('Helvetica')
      .text('Date d\'émission:', 350, dateY, { width: 200, align: 'right' })
      .font('Helvetica-Bold')
      .text(new Date(facture.date_emission).toLocaleDateString('fr-FR'), 350, dateY + 12, { width: 200, align: 'right' });

    dateY += 35;
    doc.font('Helvetica')
      .text('Date d\'échéance:', 350, dateY, { width: 200, align: 'right' })
      .font('Helvetica-Bold')
      .text(new Date(facture.date_echeance).toLocaleDateString('fr-FR'), 350, dateY + 12, { width: 200, align: 'right' });

    if (facture.statut === 'payee' && facture.date_paiement) {
      dateY += 35;
      doc.font('Helvetica').fillColor('#28a745')
        .text('Payée le:', 350, dateY, { width: 200, align: 'right' })
        .font('Helvetica-Bold')
        .text(new Date(facture.date_paiement).toLocaleDateString('fr-FR'), 350, dateY + 12, { width: 200, align: 'right' })
        .fillColor('black');
    }

    doc
      .fontSize(12).font('Helvetica-Bold').fillColor('black').text('Facturer à:', 50, 210)
      .fontSize(10).font('Helvetica')
      .text(`${client.prenom} ${client.nom}`, 50, 230)
      .text(client.adresse, 50, 245)
      .text(`${client.code_postal} ${client.ville}`, 50, 260);

    const dateDebut = new Date(facture.periode_debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    doc.fontSize(11).font('Helvetica-Bold').text(`Période: ${dateDebut}`, 50, 290);
  }

  // ─────────────────────────────────────────────────────────────
  // Tableau des lignes
  // ─────────────────────────────────────────────────────────────
  static addLignesTable(doc, lignes) {
    const tableTop  = 330;
    const tableLeft = 50;

    doc.rect(tableLeft, tableTop - 5, 510, 25).fillAndStroke('#f0f0f0', '#cccccc');
    doc.fontSize(10).font('Helvetica-Bold').fillColor('black')
      .text('Description', tableLeft + 5, tableTop + 3)
      .text('Qté',         tableLeft + 290, tableTop + 3, { width: 50,  align: 'center' })
      .text('Prix unit.',  tableLeft + 350, tableTop + 3, { width: 80,  align: 'right' })
      .text('Total',       tableLeft + 440, tableTop + 3, { width: 70,  align: 'right' });

    let yPosition = tableTop + 30;
    doc.font('Helvetica').fillColor('black');

    lignes.forEach((ligne, index) => {
      const total = parseFloat(ligne.quantite) * parseFloat(ligne.prix_unitaire);
      if (index % 2 === 0) {
        doc.rect(tableLeft, yPosition - 5, 510, 25).fill('#fafafa');
      }
      doc.fillColor('black')
        .text(ligne.description,                        tableLeft + 5,   yPosition, { width: 270 })
        .text(ligne.quantite.toString(),                tableLeft + 290,  yPosition, { width: 50,  align: 'center' })
        .text(`${parseFloat(ligne.prix_unitaire).toFixed(2)}€`, tableLeft + 350, yPosition, { width: 80,  align: 'right' })
        .text(`${total.toFixed(2)}€`,                  tableLeft + 440,  yPosition, { width: 70,  align: 'right' });
      yPosition += 25;
    });

    doc.moveTo(tableLeft, yPosition + 5).lineTo(tableLeft + 510, yPosition + 5).stroke('#cccccc');
    return yPosition + 15;
  }

  // ─────────────────────────────────────────────────────────────
  // Totaux avec statut
  // ─────────────────────────────────────────────────────────────
  static addTotauxAvecStatut(doc, facture) {
    const yStart   = 580;
    const leftCol  = 350;
    const rightCol = 470;
    const montantTTC = parseFloat(facture.montant_ttc);

    doc.rect(leftCol - 10, yStart - 10, 220, 120).fillAndStroke('#f8f9fa', '#dee2e6');

    doc.fontSize(11).font('Helvetica-Bold').fillColor('black')
      .text('Total TTC:', leftCol, yStart)
      .text(`${montantTTC.toFixed(2)}€`, rightCol, yStart, { width: 80, align: 'right' });

    doc.moveTo(leftCol, yStart + 18).lineTo(rightCol + 80, yStart + 18).stroke('#cccccc');

    if (facture.statut === 'payee') {
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#28a745')
        .text('Total payé:', leftCol, yStart + 28)
        .text(`${montantTTC.toFixed(2)}€`, rightCol, yStart + 28, { width: 80, align: 'right' });
      doc.fillColor('#6c757d')
        .text('Total dû:', leftCol, yStart + 48)
        .text('0,00€', rightCol, yStart + 48, { width: 80, align: 'right' });
      doc.roundedRect(leftCol - 5, yStart + 70, 210, 30, 5).fillAndStroke('#d4edda', '#28a745')
        .fontSize(14).font('Helvetica-Bold').fillColor('#155724')
        .text('✓ FACTURE SOLDÉE', leftCol, yStart + 78, { width: 200, align: 'center' });
    } else {
      const echeance  = new Date(facture.date_echeance);
      const now       = new Date();
      const isOverdue = echeance < now;

      doc.fontSize(11).font('Helvetica-Bold').fillColor('#6c757d')
        .text('Total payé:', leftCol, yStart + 28)
        .text('0,00€', rightCol, yStart + 28, { width: 80, align: 'right' });

      if (isOverdue) {
        const joursRetard = Math.floor((now - echeance) / (1000 * 60 * 60 * 24));
        doc.fillColor('#dc3545')
          .text('Total dû:', leftCol, yStart + 48)
          .text(`${montantTTC.toFixed(2)}€`, rightCol, yStart + 48, { width: 80, align: 'right' });
        doc.roundedRect(leftCol - 5, yStart + 70, 210, 30, 5).fillAndStroke('#f8d7da', '#dc3545')
          .fontSize(11).font('Helvetica-Bold').fillColor('#721c24')
          .text(`✗ EN RETARD (${joursRetard}j)`, leftCol, yStart + 78, { width: 200, align: 'center' });
      } else {
        doc.fillColor('#ffc107')
          .text('Total dû:', leftCol, yStart + 48)
          .text(`${montantTTC.toFixed(2)}€`, rightCol, yStart + 48, { width: 80, align: 'right' });
        doc.roundedRect(leftCol - 5, yStart + 70, 210, 30, 5).fillAndStroke('#fff3cd', '#ffc107')
          .fontSize(12).font('Helvetica-Bold').fillColor('#856404')
          .text('○ À PAYER', leftCol, yStart + 78, { width: 200, align: 'center' });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Pied de page
  // ─────────────────────────────────────────────────────────────
  static addFooter(doc, prestataire) {
    doc.fontSize(8).font('Helvetica').fillColor('gray')
      .text('Conditions de paiement: Paiement à réception de facture', 50, 750, { align: 'center', width: 500 })
      .text('En cas de retard de paiement, des pénalités de 3 fois le taux d\'intérêt légal seront applicables', 50, 765, { align: 'center', width: 500 });
  }
}

module.exports = PDFService;
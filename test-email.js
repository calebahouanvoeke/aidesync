require('dotenv').config();

console.log('=== TEST CONFIGURATION EMAIL ===');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***défini***' : 'NON DÉFINI');
console.log('================================');

const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

transporter.verify()
  .then(() => {
    console.log('✅ Configuration email OK !');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Erreur configuration email:', error);
    process.exit(1);
  });
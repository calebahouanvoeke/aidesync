const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'aidesync',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || 'admin'), // Convertir en string
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✓ PostgreSQL connecté');
});

pool.on('error', (err) => {
  console.error('Erreur PostgreSQL:', err);
  process.exit(-1);
});

const query = async (text, params) => {
  return await pool.query(text, params);
};

const getClient = async () => {
  return await pool.connect();
};

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL:', err.message);
    console.error('Mot de passe utilisé:', typeof process.env.DB_PASSWORD, process.env.DB_PASSWORD);
  } else {
    console.log('✓ PostgreSQL OK');
  }
});

module.exports = { pool, query, getClient };

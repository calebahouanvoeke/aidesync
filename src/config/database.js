const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME || 'aidesync',
      user: process.env.DB_USER || 'postgres',
      password: String(process.env.DB_PASSWORD || 'admin'),
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
  } else {
    console.log('✓ PostgreSQL OK:', res.rows[0].now);
  }
});

module.exports = { pool, query, getClient };
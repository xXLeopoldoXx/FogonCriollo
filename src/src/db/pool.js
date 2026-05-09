// ============================================================
// El Fogón Criollo – db/pool.js
// Pool de conexiones a PostgreSQL con pg
// ============================================================

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT) ?? 5432,
  database: process.env.DB_NAME     ?? 'fogon_criollo',
  user:     process.env.DB_USER     ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  max:      10,
  idleTimeoutMillis:    30000,
  connectionTimeoutMillis: 3000,
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err.message);
});

// Helper: ejecutar query con parámetros
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DB] ${duration}ms → ${text.slice(0, 60)}`);
    }
    return res;
  } catch (err) {
    console.error('[DB] Error en query:', err.message);
    throw err;
  }
}

module.exports = { pool, query };

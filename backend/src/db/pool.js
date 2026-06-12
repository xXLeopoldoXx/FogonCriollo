const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host:     process.env.DB_HOST     ?? 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     ?? 'fogon_criollo',
  user:     process.env.DB_USER     ?? 'postgres',
  password: process.env.DB_PASSWORD ?? '',
  min:      Number(process.env.DB_POOL_MIN) || 2,
  max:      Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis:       30000,
  connectionTimeoutMillis: 5000,
  statement_timeout:       30000,
});

pool.on('error', (err) => {
  require('./../../src/utils/logger').error('[DB] Pool error', { error: err.message });
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    if (process.env.NODE_ENV !== 'production') {
      const dur = Date.now() - start;
      if (dur > 500) require('../utils/logger').warn(`[DB SLOW] ${dur}ms → ${text.slice(0,80)}`);
    }
    return res;
  } catch (err) {
    require('../utils/logger').error('[DB] Query error', { error: err.message, query: text.slice(0,120) });
    throw err;
  }
}

module.exports = { pool, query };

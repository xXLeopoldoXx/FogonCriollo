// ============================================================
// El Fogón Criollo – models/mesaModel.js
// Acceso a datos: tabla mesa
// ============================================================

const { query } = require('../db/pool');

async function getAll() {
  const { rows } = await query(
    'SELECT id_mesa, numero, piso, capacidad FROM mesa ORDER BY piso, numero'
  );
  return rows;
}

module.exports = { getAll };

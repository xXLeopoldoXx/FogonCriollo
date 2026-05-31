// ============================================================
// El Fogón Criollo – models/usuarioModel.js
// Acceso a datos: tabla usuario + log_sistema
// ============================================================

const { query } = require('../db/pool');

async function findByUsername(username) {
  const { rows } = await query(
    `SELECT u.id_usuario, u.username, u.password, u.rol,
            m.nombre, m.id_mesero
     FROM usuario u
     JOIN mesero m ON m.id_mesero = u.id_mesero
     WHERE u.username = $1`,
    [username]
  );
  return rows[0] ?? null;
}

async function logAccion(username, accion, detalle = null, exitoso = true) {
  await query(
    `INSERT INTO log_sistema (username, accion, detalle, exitoso)
     VALUES ($1, $2, $3, $4)`,
    [username, accion, detalle, exitoso]
  ).catch(() => {});
}

module.exports = { findByUsername, logAccion };

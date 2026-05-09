// ============================================================
// El Fogón Criollo – controllers/authController.js
// ============================================================

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../db/pool');

async function login(req, res) {
  const { username, password, rol } = req.body;

  if (!username || !password || !rol) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    // Buscar usuario con su mesero asociado
    const { rows } = await query(
      `SELECT u.id_usuario, u.username, u.password, u.rol,
              m.nombre, m.id_mesero
       FROM usuario u
       JOIN mesero m ON m.id_mesero = u.id_mesero
       WHERE u.username = $1`,
      [username]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Validar rol
    if (user.rol !== rol) {
      return res.status(401).json({ message: 'Usuario, contraseña o rol incorrecto.' });
    }

    // Validar contraseña
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    // Registrar en log_sistema
    await query(
      `INSERT INTO log_sistema (username, accion, detalle, exitoso)
       VALUES ($1, 'LOGIN', $2, true)`,
      [username, `Login exitoso desde rol ${rol}`]
    ).catch(() => {}); // no bloquear si falla el log

    // Generar JWT
    const token = jwt.sign(
      { id: user.id_usuario, username: user.username, rol: user.rol, id_mesero: user.id_mesero },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES ?? '8h' }
    );

    return res.json({
      token,
      usuario: {
        id:        user.id_usuario,
        username:  user.username,
        rol:       user.rol,
        nombre:    user.nombre,
        id_mesero: user.id_mesero,
      },
    });
  } catch (err) {
    console.error('[Auth] Error en login:', err.message);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function logout(req, res) {
  const { username } = req.user ?? {};
  await query(
    `INSERT INTO log_sistema (username, accion, exitoso) VALUES ($1, 'LOGOUT', true)`,
    [username]
  ).catch(() => {});
  return res.json({ message: 'Sesión cerrada' });
}

module.exports = { login, logout };

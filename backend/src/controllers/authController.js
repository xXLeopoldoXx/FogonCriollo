// ============================================================
// El Fogón Criollo – controllers/authController.js
// ============================================================

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');

async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Faltan campos requeridos' });
  }

  try {
    const user = await usuarioModel.findByUsername(username);

    if (!user) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
      return res.status(401).json({ message: 'Credenciales incorrectas' });
    }

    await usuarioModel.logAccion(username, 'LOGIN', `Login exitoso como ${user.rol}`, true);

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
  await usuarioModel.logAccion(username, 'LOGOUT', null, true);
  return res.json({ message: 'Sesión cerrada' });
}

module.exports = { login, logout };

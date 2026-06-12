const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const usuarioModel = require('../models/usuarioModel');
const { revokeToken } = require('../middleware/auth');
const logger  = require('../utils/logger');

async function login(req, res) {
  const { username, password } = req.body;
  try {
    const user = await usuarioModel.findByUsername(username);
    if (!user) {
      logger.warn('Login fallido: usuario no encontrado', { username });
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      logger.warn('Login fallido: contraseña incorrecta', { username });
      return res.status(401).json({ message: 'Credenciales incorrectas.' });
    }
    await usuarioModel.logAccion(username, 'LOGIN', `Rol: ${user.rol}`, true);
    const token = jwt.sign(
      { id: user.id_usuario, username: user.username, rol: user.rol, id_mesero: user.id_mesero },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES ?? '8h' }
    );
    logger.info('Login exitoso', { username, rol: user.rol });
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
    logger.error('Error en login', { error: err.message });
    return res.status(500).json({ message: 'Error interno del servidor.' });
  }
}

async function logout(req, res) {
  const { username } = req.user ?? {};
  await revokeToken(req.token);
  await usuarioModel.logAccion(username, 'LOGOUT', null, true);
  logger.info('Logout', { username });
  return res.json({ message: 'Sesión cerrada.' });
}

async function me(req, res) {
  try {
    const user = await usuarioModel.findByUsername(req.user.username);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
    res.json({
      id:        user.id_usuario,
      username:  user.username,
      rol:       user.rol,
      nombre:    user.nombre,
      id_mesero: user.id_mesero,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = { login, logout, me };

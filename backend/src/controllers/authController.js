// controllers/authController.js
const authService = require('../services/authService');
const { ok, creado, error, badRequest } = require('../utils/response');
const { verificarRefreshToken, generarToken } = require('../utils/jwt');
const pool = require('../config/db');

const login = async (req, res) => {
  try {
    const data = await authService.autenticar(req.body.correo, req.body.contrasena);
    ok(res, data, 'Sesión iniciada.');
  } catch (err) {
    error(res, err.message, 401);
  }
};

const register = async (req, res) => {
  try {
    const usuario = await authService.registrar(req.body);
    creado(res, usuario, 'Usuario registrado.');
  } catch (err) {
    error(res, err.message, 400);
  }
};

const perfil = async (req, res) => {
  try {
    const data = await authService.obtenerPerfil(req.usuario.id_usuario);
    ok(res, data);
  } catch (err) {
    error(res, err.message, 404);
  }
};

const cambiarContrasena = async (req, res) => {
  try {
    await authService.cambiarContrasena(req.usuario.id_usuario, req.body.contrasena_actual, req.body.contrasena_nueva);
    ok(res, {}, 'Contraseña actualizada.');
  } catch (err) {
    error(res, err.message, 400);
  }
};

const refreshToken = async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) return badRequest(res, 'Refresh token requerido.');

    const payload = verificarRefreshToken(refresh_token);
    const [rows] = await pool.execute(
      `SELECT u.*, r.nombre AS rol, e.nombre AS empresa, e.tasa_iva
       FROM usuarios u
       JOIN roles r ON u.id_rol = r.id_rol
       JOIN empresas e ON u.id_empresa = e.id_empresa
       WHERE u.id_usuario = ? AND u.activo = 1`,
      [payload.id_usuario]
    );
    if (!rows.length) return error(res, 'Usuario no encontrado.', 404);

    const u = rows[0];
    const nuevoToken = generarToken({
      id_usuario: u.id_usuario, nombre: u.nombre, correo: u.correo,
      id_rol: u.id_rol, rol: u.rol, id_empresa: u.id_empresa,
      empresa: u.empresa, tasa_iva: u.tasa_iva, id_sucursal: u.id_sucursal,
    });

    ok(res, { token: nuevoToken }, 'Token renovado.');
  } catch (err) {
    error(res, 'Refresh token inválido o expirado.', 401);
  }
};

module.exports = { login, register, perfil, cambiarContrasena, refreshToken };

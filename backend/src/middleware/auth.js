// middleware/auth.js — Autenticación, roles y auditoría
const { verificarToken } = require('../utils/jwt');
const { noAutorizado, sinPermiso } = require('../utils/response');
const pool = require('../config/db');

// Verifica JWT válido e inyecta req.usuario
const autenticado = (req, res, next) => {
  const header = req.headers['authorization'];
  const token  = header && header.split(' ')[1];

  if (!token) return noAutorizado(res, 'Token requerido.');

  try {
    req.usuario = verificarToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return noAutorizado(res, 'Sesión expirada. Inicia sesión nuevamente.');
    return noAutorizado(res, 'Token inválido.');
  }
};

// Solo Administrador (id_rol = 1)
const soloAdmin = (req, res, next) => {
  if (req.usuario.id_rol !== 1)
    return sinPermiso(res, 'Acceso restringido a Administradores.');
  next();
};

// Solo Almacenista (id_rol = 3)
const soloAlmacenista = (req, res, next) => {
  if (req.usuario.id_rol !== 3)
    return sinPermiso(res, 'Acceso restringido a Almacenistas.');
  next();
};

// Admin o Almacenista
const adminOAlmacenista = (req, res, next) => {
  if (![1, 3].includes(req.usuario.id_rol))
    return sinPermiso(res, 'Se requiere rol Administrador o Almacenista.');
  next();
};

// Factory: permite múltiples roles
const requiereRol = (roles = []) => (req, res, next) => {
  if (!roles.includes(req.usuario.id_rol))
    return sinPermiso(res, `Roles permitidos: ${roles.join(', ')}`);
  next();
};

// Middleware de auditoría — registra acción en la tabla auditoria
const auditar = (accion, tabla = null) => async (req, res, next) => {
  const original = res.json.bind(res);

  res.json = async (body) => {
    if (body?.ok && req.usuario) {
      try {
        await pool.execute(
          `INSERT INTO auditoria (id_usuario, id_empresa, accion, tabla, id_registro, datos_nuevo, ip_address, user_agent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            req.usuario.id_usuario,
            req.usuario.id_empresa,
            accion,
            tabla,
            body.data?.id || null,
            JSON.stringify(req.body || {}),
            req.ip,
            req.headers['user-agent'] || null,
          ]
        );
      } catch (_) { /* auditoría no debe interrumpir la respuesta */ }
    }
    return original(body);
  };

  next();
};

module.exports = { autenticado, soloAdmin, soloAlmacenista, adminOAlmacenista, requiereRol, auditar };

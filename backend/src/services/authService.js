// services/authService.js — Lógica de negocio de autenticación
const bcrypt = require('bcryptjs');
const pool   = require('../config/db');
const { generarToken, generarRefreshToken } = require('../utils/jwt');

const autenticar = async (correo, contrasena) => {
  const [rows] = await pool.execute(
    `SELECT u.*, r.nombre AS rol, e.nombre AS empresa, e.tasa_iva,
            s.nombre AS sucursal_nombre
     FROM usuarios u
     JOIN roles r     ON u.id_rol     = r.id_rol
     JOIN empresas e  ON u.id_empresa = e.id_empresa
     LEFT JOIN sucursales s ON u.id_sucursal = s.id_sucursal
     WHERE u.correo = ? AND u.activo = 1`,
    [correo]
  );

  if (!rows.length) throw new Error('Credenciales incorrectas.');

  const usuario = rows[0];
  const valida  = await bcrypt.compare(contrasena, usuario.contrasena);
  if (!valida)  throw new Error('Credenciales incorrectas.');

  // Actualizar último acceso
  await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id_usuario = ?', [usuario.id_usuario]);

  const payload = {
    id_usuario:  usuario.id_usuario,
    nombre:      usuario.nombre,
    apellido:    usuario.apellido,
    correo:      usuario.correo,
    id_rol:      usuario.id_rol,
    rol:         usuario.rol,
    id_empresa:  usuario.id_empresa,
    empresa:     usuario.empresa,
    tasa_iva:    usuario.tasa_iva,
    id_sucursal: usuario.id_sucursal,
    sucursal:    usuario.sucursal_nombre,
    avatar_url:  usuario.avatar_url,
  };

  return {
    token:        generarToken(payload),
    refreshToken: generarRefreshToken({ id_usuario: usuario.id_usuario }),
    usuario:      payload,
  };
};

const registrar = async ({ nombre, apellido, correo, contrasena, id_rol, id_empresa, id_sucursal, telefono }) => {
  const [existe] = await pool.execute('SELECT id_usuario FROM usuarios WHERE correo = ?', [correo]);
  if (existe.length) throw new Error('El correo ya está registrado.');

  const hash = await bcrypt.hash(contrasena, 10);
  const [result] = await pool.execute(
    `INSERT INTO usuarios (nombre, apellido, correo, contrasena, id_rol, id_empresa, id_sucursal, telefono)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [nombre, apellido || null, correo, hash, id_rol, id_empresa, id_sucursal || null, telefono || null]
  );

  return { id_usuario: result.insertId, nombre, correo };
};

const cambiarContrasena = async (id_usuario, actual, nueva) => {
  const [rows] = await pool.execute('SELECT contrasena FROM usuarios WHERE id_usuario = ?', [id_usuario]);
  if (!rows.length) throw new Error('Usuario no encontrado.');

  const valida = await bcrypt.compare(actual, rows[0].contrasena);
  if (!valida)   throw new Error('Contraseña actual incorrecta.');

  const hash = await bcrypt.hash(nueva, 10);
  await pool.execute('UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?', [hash, id_usuario]);
};

const obtenerPerfil = async (id_usuario) => {
  const [rows] = await pool.execute(
    `SELECT u.id_usuario, u.nombre, u.apellido, u.correo, u.telefono, u.avatar_url,
            u.ultimo_acceso, u.creado_en,
            r.nombre AS rol, e.nombre AS empresa, s.nombre AS sucursal
     FROM usuarios u
     JOIN roles r    ON u.id_rol     = r.id_rol
     JOIN empresas e ON u.id_empresa = e.id_empresa
     LEFT JOIN sucursales s ON u.id_sucursal = s.id_sucursal
     WHERE u.id_usuario = ?`,
    [id_usuario]
  );
  if (!rows.length) throw new Error('Usuario no encontrado.');
  return rows[0];
};

module.exports = { autenticar, registrar, cambiarContrasena, obtenerPerfil };

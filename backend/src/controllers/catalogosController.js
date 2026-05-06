// controllers/catalogosController.js
const pool = require('../config/db');
const { ok, creado, error, noEncontrado } = require('../utils/response');

// ── CATEGORÍAS ──────────────────────────────────────────────
const getCategorias = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM categorias WHERE id_empresa=? AND activo=1 ORDER BY nombre',
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, color, icono } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO categorias (id_empresa,nombre,descripcion,color,icono) VALUES (?,?,?,?,?)',
      [req.usuario.id_empresa, nombre, descripcion||null, color||'#FF6B35', icono||null]
    );
    creado(res, { id: r.insertId }, 'Categoría creada.');
  } catch (err) { error(res, err.code==='ER_DUP_ENTRY'?'Categoría ya existe.':err.message, 400); }
};

const actualizarCategoria = async (req, res) => {
  try {
    const { nombre, descripcion, color, icono } = req.body;
    const [r] = await pool.execute(
      'UPDATE categorias SET nombre=?,descripcion=?,color=?,icono=? WHERE id_categoria=? AND id_empresa=?',
      [nombre, descripcion||null, color||'#FF6B35', icono||null, req.params.id, req.usuario.id_empresa]
    );
    if (!r.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Categoría actualizada.');
  } catch (err) { error(res, err.message); }
};

const eliminarCategoria = async (req, res) => {
  try {
    const [r] = await pool.execute(
      'UPDATE categorias SET activo=0 WHERE id_categoria=? AND id_empresa=?',
      [req.params.id, req.usuario.id_empresa]
    );
    if (!r.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Categoría eliminada.');
  } catch (err) { error(res, err.message); }
};

// ── PROVEEDORES ──────────────────────────────────────────────
const getProveedores = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM proveedores WHERE id_empresa=? AND activo=1 ORDER BY nombre',
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

const crearProveedor = async (req, res) => {
  try {
    const { nombre, nit, contacto, telefono, email, direccion, ciudad } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO proveedores (id_empresa,nombre,nit,contacto,telefono,email,direccion,ciudad) VALUES (?,?,?,?,?,?,?,?)',
      [req.usuario.id_empresa, nombre, nit||null, contacto||null, telefono||null, email||null, direccion||null, ciudad||null]
    );
    creado(res, { id: r.insertId }, 'Proveedor creado.');
  } catch (err) { error(res, err.message, 400); }
};

const actualizarProveedor = async (req, res) => {
  try {
    const { nombre, nit, contacto, telefono, email, direccion, ciudad } = req.body;
    const [r] = await pool.execute(
      'UPDATE proveedores SET nombre=?,nit=?,contacto=?,telefono=?,email=?,direccion=?,ciudad=? WHERE id_proveedor=? AND id_empresa=?',
      [nombre, nit||null, contacto||null, telefono||null, email||null, direccion||null, ciudad||null, req.params.id, req.usuario.id_empresa]
    );
    if (!r.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Proveedor actualizado.');
  } catch (err) { error(res, err.message); }
};

const eliminarProveedor = async (req, res) => {
  try {
    const [r] = await pool.execute(
      'UPDATE proveedores SET activo=0 WHERE id_proveedor=? AND id_empresa=?',
      [req.params.id, req.usuario.id_empresa]
    );
    if (!r.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Proveedor eliminado.');
  } catch (err) { error(res, err.message); }
};

// ── CLIENTES ──────────────────────────────────────────────────
const getClientes = async (req, res) => {
  try {
    const { busqueda } = req.query;
    let where = 'WHERE id_empresa=? AND activo=1';
    const params = [req.usuario.id_empresa];
    if (busqueda) { where += ' AND (nombre LIKE ? OR documento LIKE ? OR email LIKE ?)'; params.push(`%${busqueda}%`,`%${busqueda}%`,`%${busqueda}%`); }
    const [rows] = await pool.execute(`SELECT * FROM clientes ${where} ORDER BY nombre`, params);
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

const crearCliente = async (req, res) => {
  try {
    const { tipo_documento, documento, nombre, apellido, email, telefono, direccion, ciudad } = req.body;
    const [r] = await pool.execute(
      'INSERT INTO clientes (id_empresa,tipo_documento,documento,nombre,apellido,email,telefono,direccion,ciudad) VALUES (?,?,?,?,?,?,?,?,?)',
      [req.usuario.id_empresa, tipo_documento||'CC', documento||null, nombre, apellido||null, email||null, telefono||null, direccion||null, ciudad||null]
    );
    creado(res, { id: r.insertId }, 'Cliente creado.');
  } catch (err) { error(res, err.code==='ER_DUP_ENTRY'?'Documento ya registrado.':err.message, 400); }
};

const actualizarCliente = async (req, res) => {
  try {
    const { tipo_documento, documento, nombre, apellido, email, telefono, direccion, ciudad } = req.body;
    const [r] = await pool.execute(
      'UPDATE clientes SET tipo_documento=?,documento=?,nombre=?,apellido=?,email=?,telefono=?,direccion=?,ciudad=? WHERE id_cliente=? AND id_empresa=?',
      [tipo_documento||'CC', documento||null, nombre, apellido||null, email||null, telefono||null, direccion||null, ciudad||null, req.params.id, req.usuario.id_empresa]
    );
    if (!r.affectedRows) return noEncontrado(res);
    ok(res, {}, 'Cliente actualizado.');
  } catch (err) { error(res, err.message); }
};

// ── USUARIOS ──────────────────────────────────────────────────
const getUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.id_usuario,u.nombre,u.apellido,u.correo,u.telefono,u.avatar_url,
              u.activo,u.ultimo_acceso,u.creado_en,
              r.nombre AS rol, s.nombre AS sucursal
       FROM usuarios u
       JOIN roles r ON u.id_rol=r.id_rol
       LEFT JOIN sucursales s ON u.id_sucursal=s.id_sucursal
       WHERE u.id_empresa=? ORDER BY u.nombre`,
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

const getRoles = async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id_rol,nombre,descripcion FROM roles WHERE activo=1');
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

const getSucursales = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM sucursales WHERE id_empresa=? AND activo=1 ORDER BY nombre',
      [req.usuario.id_empresa]
    );
    ok(res, rows);
  } catch (err) { error(res, err.message); }
};

module.exports = {
  getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria,
  getProveedores, crearProveedor, actualizarProveedor, eliminarProveedor,
  getClientes, crearCliente, actualizarCliente,
  getUsuarios, getRoles, getSucursales,
};

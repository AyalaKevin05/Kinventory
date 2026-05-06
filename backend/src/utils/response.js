// utils/response.js — Respuestas estandarizadas
const ok = (res, data = {}, mensaje = 'OK', status = 200) =>
  res.status(status).json({ ok: true, mensaje, data });

const creado = (res, data = {}, mensaje = 'Creado exitosamente') =>
  ok(res, data, mensaje, 201);

const error = (res, mensaje = 'Error interno', status = 500, errores = null) =>
  res.status(status).json({ ok: false, mensaje, ...(errores && { errores }) });

const noEncontrado = (res, mensaje = 'Recurso no encontrado') =>
  error(res, mensaje, 404);

const sinPermiso = (res, mensaje = 'Sin permisos para esta acción') =>
  error(res, mensaje, 403);

const noAutorizado = (res, mensaje = 'No autorizado') =>
  error(res, mensaje, 401);

const badRequest = (res, mensaje = 'Datos inválidos', errores = null) =>
  error(res, mensaje, 400, errores);

module.exports = { ok, creado, error, noEncontrado, sinPermiso, noAutorizado, badRequest };

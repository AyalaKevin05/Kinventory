// middleware/validate.js — Validación con express-validator
const { validationResult } = require('express-validator');
const { badRequest } = require('../utils/response');

const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return badRequest(res, 'Datos inválidos.', errores.array().map(e => ({ campo: e.path, mensaje: e.msg })));
  }
  next();
};

module.exports = { validar };

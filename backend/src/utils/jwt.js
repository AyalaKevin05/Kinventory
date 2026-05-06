// utils/jwt.js — Utilidad JWT
const jwt = require('jsonwebtoken');

const generarToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '8h' });

const generarRefreshToken = (payload) =>
  jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });

const verificarToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);

const verificarRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET);

const decodificarToken = (token) =>
  jwt.decode(token);

module.exports = { generarToken, generarRefreshToken, verificarToken, verificarRefreshToken, decodificarToken };

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as loginAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario]   = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ki_token');
    const u     = localStorage.getItem('ki_usuario');
    if (token && u) setUsuario(JSON.parse(u));
    setCargando(false);
  }, []);

  const login = async (correo, contrasena) => {
    const { data } = await loginAPI({ correo, contrasena });
    localStorage.setItem('ki_token',   data.data.token);
    localStorage.setItem('ki_refresh', data.data.refreshToken);
    localStorage.setItem('ki_usuario', JSON.stringify(data.data.usuario));
    setUsuario(data.data.usuario);
    return data.data;
  };

  const logout = useCallback(() => {
    localStorage.removeItem('ki_token');
    localStorage.removeItem('ki_refresh');
    localStorage.removeItem('ki_usuario');
    setUsuario(null);
  }, []);

  const esAdmin       = () => usuario?.id_rol === 1;
  const esVendedor    = () => usuario?.id_rol === 2;
  const esAlmacenista = () => usuario?.id_rol === 3;

  return (
    <AuthContext.Provider value={{ usuario, login, logout, esAdmin, esVendedor, esAlmacenista, cargando }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

import axios from 'axios';

const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('ki_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (r) => r,
  async (err) => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('ki_refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(`${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem('ki_token', data.data.token);
          err.config.headers.Authorization = `Bearer ${data.data.token}`;
          return API.request(err.config);
        } catch (_) {}
      }
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login            = (d)      => API.post('/auth/login', d);
export const refreshToken     = (d)      => API.post('/auth/refresh', d);
export const getPerfil        = ()       => API.get('/auth/perfil');
export const cambiarContrasena= (d)      => API.put('/auth/contrasena', d);
export const registrarUsuario = (d)      => API.post('/auth/register', d);

// Dashboard
export const getDashboardResumen   = () => API.get('/dashboard/resumen');
export const getTopProductos       = (p={}) => API.get('/dashboard/top-productos', { params: p });
export const getVentasMes          = () => API.get('/dashboard/ventas-mes');

// Productos
export const getProductos       = (p={}) => API.get('/productos', { params: p });
export const getProducto        = (id)   => API.get(`/productos/${id}`);
export const crearProducto      = (d)    => API.post('/productos', d);
export const actualizarProducto = (id,d) => API.put(`/productos/${id}`, d);
export const eliminarProducto   = (id)   => API.delete(`/productos/${id}`);
export const getStockBajo       = ()     => API.get('/productos/stock-bajo');
export const alertarStock       = ()     => API.post('/productos/alerta-stock');

// Ventas
export const getVentas    = (p={}) => API.get('/ventas', { params: p });
export const getVenta     = (id)   => API.get(`/ventas/${id}`);
export const crearVenta   = (d)    => API.post('/ventas', d);
export const cancelarVenta= (id)   => API.patch(`/ventas/${id}/cancelar`);

// Inventario
export const getMovimientos      = (p={}) => API.get('/inventario/movimientos', { params: p });
export const registrarMovimiento = (d)    => API.post('/inventario/movimiento', d);
export const ajustarStock        = (d)    => API.post('/inventario/ajuste', d);
export const getResumenInventario= ()     => API.get('/inventario/resumen');
export const getLotesProducto    = (id)   => API.get(`/inventario/lotes/${id}`);

// Facturas
export const getFacturas      = (p={}) => API.get('/facturas', { params: p });
export const getFactura       = (id)   => API.get(`/facturas/${id}`);
export const getResumenFact   = ()     => API.get('/facturas/resumen');
export const cambiarEstadoFact= (id,d) => API.patch(`/facturas/${id}/estado`, d);

// Catálogos
export const getCategorias       = ()       => API.get('/categorias');
export const crearCategoria      = (d)      => API.post('/categorias', d);
export const actualizarCategoria = (id,d)   => API.put(`/categorias/${id}`, d);
export const eliminarCategoria   = (id)     => API.delete(`/categorias/${id}`);

export const getProveedores      = ()       => API.get('/proveedores');
export const crearProveedor      = (d)      => API.post('/proveedores', d);
export const actualizarProveedor = (id,d)   => API.put(`/proveedores/${id}`, d);
export const eliminarProveedor   = (id)     => API.delete(`/proveedores/${id}`);

export const getClientes         = (p={})   => API.get('/clientes', { params: p });
export const crearCliente        = (d)      => API.post('/clientes', d);
export const actualizarCliente   = (id,d)   => API.put(`/clientes/${id}`, d);

export const getUsuarios         = ()       => API.get('/usuarios');
export const getRoles            = ()       => API.get('/roles');
export const getSucursales       = ()       => API.get('/sucursales');

// Reportes
export const getAuditoria           = (p={}) => API.get('/reportes/auditoria', { params: p });
export const getVentasPorVendedor   = ()     => API.get('/reportes/ventas-por-vendedor');
export const exportarInventario     = ()     => API.get('/reportes/exportar-inventario');

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Layouts
import AdminLayout from './components/admin/AdminLayout';

// Pages
import Login from './pages/Login';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import Productos      from './pages/admin/Productos';
import Ventas         from './pages/admin/Ventas';
import Inventario     from './pages/admin/Inventario';
import Facturas       from './pages/admin/Facturas';
import Clientes       from './pages/admin/Clientes';
import Reportes       from './pages/admin/Reportes';
import Configuracion  from './pages/admin/Configuracion';

// Vendedor
import POS from './pages/vendedor/POS';

// Almacenista
import Bodega from './pages/almacenista/Bodega';

// ── Guards ───────────────────────────────────────────────────
const RutaPrivada = ({ children }) => {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', color:'var(--text-muted)', fontFamily:'var(--font-body)' }}><span className="ki-spinner" /></div>;
  return usuario ? children : <Navigate to="/login" replace />;
};

const SoloRol = ({ roles, children }) => {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (!roles.includes(usuario.id_rol)) {
    if (usuario.id_rol === 1) return <Navigate to="/admin/dashboard" replace />;
    if (usuario.id_rol === 2) return <Navigate to="/pos" replace />;
    return <Navigate to="/bodega" replace />;
  }
  return children;
};

// ── Redirect por rol al hacer login ──────────────────────────
const RedireccionPorRol = () => {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.id_rol === 1) return <Navigate to="/admin/dashboard" replace />;
  if (usuario.id_rol === 2) return <Navigate to="/pos" replace />;
  return <Navigate to="/bodega" replace />;
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', fontFamily: 'var(--font-body)' },
              success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
          <Routes>
            {/* Login */}
            <Route path="/login" element={<Login />} />

            {/* Redirect raíz por rol */}
            <Route path="/" element={<RutaPrivada><RedireccionPorRol /></RutaPrivada>} />

            {/* ── ADMIN ────────────────────────────────── */}
            <Route path="/admin" element={<RutaPrivada><SoloRol roles={[1]}><AdminLayout /></SoloRol></RutaPrivada>}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard"    element={<AdminDashboard />} />
              <Route path="productos"    element={<Productos />} />
              <Route path="ventas"       element={<Ventas />} />
              <Route path="inventario"   element={<Inventario />} />
              <Route path="facturas"     element={<Facturas />} />
              <Route path="clientes"     element={<Clientes />} />
              <Route path="reportes"     element={<Reportes />} />
              <Route path="configuracion" element={<Configuracion />} />
            </Route>

            {/* ── VENDEDOR — POS ───────────────────────── */}
            <Route path="/pos" element={<RutaPrivada><SoloRol roles={[2]}><POS /></SoloRol></RutaPrivada>} />

            {/* ── ALMACENISTA — BODEGA ─────────────────── */}
            <Route path="/bodega" element={<RutaPrivada><SoloRol roles={[3]}><Bodega /></SoloRol></RutaPrivada>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { KiLogo, ThemeToggle } from '../common';
import { useState } from 'react';

const NAV = [
  { to: '/admin/dashboard',   icon: '▦',  label: 'Dashboard' },
  { to: '/admin/productos',   icon: '📦', label: 'Productos' },
  { to: '/admin/ventas',      icon: '🧾', label: 'Ventas' },
  { to: '/admin/inventario',  icon: '🏭', label: 'Inventario' },
  { to: '/admin/facturas',    icon: '📄', label: 'Facturación' },
  { to: '/admin/clientes',    icon: '👥', label: 'Clientes' },
  { to: '/admin/reportes',    icon: '📊', label: 'Reportes' },
  { to: '/admin/configuracion',icon: '⚙️',label: 'Configuración' },
];

export default function AdminLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 64 : 'var(--sidebar-width)',
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', height: '100vh', top: 0, left: 0,
        transition: 'width 0.2s ease',
        zIndex: 10, overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: collapsed ? '1.25rem 0' : '1.25rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', minHeight: 60 }}>
          {!collapsed && <KiLogo size="sm" />}
          {collapsed && <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--orange-primary)', fontFamily: 'var(--font-display)' }}>K</span>}
          <button onClick={() => setCollapsed(c => !c)} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '1rem', padding: '0.2rem', cursor: 'pointer', display: collapsed ? 'none' : 'flex' }}>◀</button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: collapsed ? '0.75rem' : '0.65rem 1.25rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: isActive ? 'var(--orange-primary)' : 'var(--text-secondary)',
              background: isActive ? 'var(--orange-dim)' : 'transparent',
              borderRight: isActive ? '3px solid var(--orange-primary)' : '3px solid transparent',
              fontSize: '13px', fontWeight: isActive ? 600 : 400,
              transition: 'var(--transition)', textDecoration: 'none',
              margin: '1px 0',
            })}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{n.icon}</span>
              {!collapsed && n.label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div style={{ padding: collapsed ? '0.75rem 0' : '0.75rem 1rem', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--orange-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                {usuario?.nombre?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{usuario?.nombre}</p>
                <p style={{ fontSize: '10px', color: 'var(--orange-primary)', fontWeight: 600 }}>{usuario?.rol}</p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{ width: '100%', padding: '0.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            {collapsed ? '⬅' : '← Salir'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: collapsed ? 64 : 'var(--sidebar-width)', flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.2s ease' }}>
        {/* Top bar */}
        <header style={{ height: 56, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 1.5rem', gap: '0.75rem', position: 'sticky', top: 0, zIndex: 5 }}>
          <ThemeToggle />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.75rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{usuario?.empresa}</span>
            <span style={{ color: 'var(--border)' }}>|</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{usuario?.sucursal}</span>
          </div>
        </header>
        <main style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
          <div className="ki-fade-in"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}

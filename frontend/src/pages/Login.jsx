import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { KiLogo, Btn, Input } from '../components/common';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, esAdmin, esVendedor, esAlmacenista } = useAuth();
  const navigate = useNavigate();
  const [form, setForm]       = useState({ correo: '', contrasena: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(form.correo, form.contrasena);
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
      if (data.usuario.id_rol === 1) navigate('/admin/dashboard');
      else if (data.usuario.id_rol === 2) navigate('/pos');
      else navigate('/bodega');
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Credenciales incorrectas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', fontFamily: 'var(--font-body)' }}>
      {/* Panel izquierdo — decorativo */}
      <div style={{
        display: 'none',
        '@media(min-width:900px)': { display: 'flex' },
        flex: 1, background: 'linear-gradient(135deg, #1A1A1A 0%, #212121 50%, #1A1A1A 100%)',
        alignItems: 'center', justifyContent: 'center', padding: '3rem', position: 'relative', overflow: 'hidden',
      }}>
        {/* Círculo decorativo */}
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', border: '1px solid var(--border)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.3 }} />
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', border: '1px solid var(--border)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', opacity: 0.15 }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'var(--orange-dim)', top: '20%', right: '20%', filter: 'blur(60px)' }} />
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <KiLogo size="xl" />
          <p style={{ color: 'var(--text-muted)', marginTop: '1rem', fontSize: '0.95rem', maxWidth: 300, lineHeight: 1.7 }}>
            Sistema profesional de inventario y ventas para tu negocio.
          </p>
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              ['⚡', 'Ventas rápidas con POS integrado'],
              ['📦', 'Control total de inventario'],
              ['📊', 'Reportes y analíticas en tiempo real'],
              ['🏭', 'Gestión de bodega por almacenista'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '13px' }}>
                <span style={{ color: 'var(--orange-primary)' }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — form */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <KiLogo size="lg" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--text-primary)', marginTop: '1.5rem' }}>Iniciar sesión</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.3rem' }}>Ingresa tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="correo@empresa.com"
              value={form.correo}
              onChange={e => setForm({ ...form, correo: e.target.value })}
              required
              autoComplete="email"
            />
            <div>
              <Input
                label="Contraseña"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.contrasena}
                onChange={e => setForm({ ...form, contrasena: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPass(s => !s)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', marginTop: '0.3rem', padding: 0 }}>
                {showPass ? 'Ocultar' : 'Mostrar'} contraseña
              </button>
            </div>

            <Btn type="submit" loading={loading} fullWidth size="lg" style={{ marginTop: '0.5rem', boxShadow: loading ? 'none' : 'var(--shadow-orange)' }}>
              Ingresar al sistema
            </Btn>
          </form>

          {/* Roles info */}
          <div style={{ marginTop: '2rem', padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Accesos de prueba</p>
            {[
              ['Admin', 'admin@kinventory.com', 'Admin123!'],
              ['Vendedor', 'vendedor@kinventory.com', 'Vend123!'],
              ['Almacenista', 'almacenista@kinventory.com', 'Alma123!'],
            ].map(([rol, correo, pass]) => (
              <button key={rol} type="button"
                onClick={() => setForm({ correo, contrasena: pass })}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'transparent', border: 'none', padding: '0.3rem 0', cursor: 'pointer', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: 'var(--orange-primary)', fontWeight: 600 }}>{rol}</span>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{correo}</span>
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11px', color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} Kinventory. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}

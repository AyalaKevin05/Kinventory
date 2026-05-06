import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProductos, getMovimientos, registrarMovimiento, ajustarStock, getResumenInventario } from '../../services/api';
import { KiLogo, Btn, Input, Select, PageHeader, StatCard, EmptyState } from '../../components/common';
import toast from 'react-hot-toast';

const TIPOS_ENTRADA = [
  { id: 'entrada_compra',     label: '📥 Compra a proveedor' },
  { id: 'entrada_devolucion', label: '↩️ Devolución de cliente' },
  { id: 'entrada_ajuste',     label: '🔧 Ajuste de entrada' },
  { id: 'traslado_entrada',   label: '🔄 Traslado (entrada)' },
];
const TIPOS_SALIDA = [
  { id: 'salida_reposicion',  label: '🔄 Reposición en vitrina' },
  { id: 'salida_baja',        label: '🗑️ Baja / merma' },
  { id: 'salida_ajuste',      label: '🔧 Ajuste de salida' },
  { id: 'traslado_salida',    label: '📤 Traslado (salida)' },
];

export default function Bodega() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]             = useState('movimientos');
  const [productos, setProductos] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen]     = useState(null);
  const [modal, setModal]         = useState(null); // 'entrada' | 'salida' | 'ajuste'
  const [form, setForm]           = useState({ id_producto: '', cantidad: 1, tipo: '', referencia: '', proveedor: '', notas: '', costo_unitario: 0, stock_nuevo: 0 });
  const [cargando, setCargando]   = useState(true);
  const [enviando, setEnviando]   = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [p, m, r] = await Promise.all([getProductos({ limit: 500 }), getMovimientos({ limit: 50 }), getResumenInventario()]);
      setProductos(p.data.data.productos);
      setMovimientos(m.data.data.movimientos);
      setResumen(r.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (tipo) => {
    setModal(tipo);
    setForm({ id_producto: '', cantidad: 1, tipo: tipo === 'entrada' ? 'entrada_compra' : tipo === 'salida' ? 'salida_reposicion' : '', referencia: '', proveedor: '', notas: '', costo_unitario: 0, stock_nuevo: 0 });
  };

  const guardar = async () => {
    if (!form.id_producto) return toast.error('Selecciona un producto.');
    setEnviando(true);
    try {
      if (modal === 'ajuste') {
        await ajustarStock({ id_producto: form.id_producto, stock_nuevo: parseInt(form.stock_nuevo), motivo: form.notas });
        toast.success('Stock ajustado correctamente.');
      } else {
        const { data } = await registrarMovimiento({ ...form, cantidad: parseInt(form.cantidad), costo_unitario: parseFloat(form.costo_unitario) || 0 });
        toast.success(data.mensaje);
        if (data.data?.alerta) toast(data.data.alerta === 'AGOTADO' ? '⚠️ Producto AGOTADO' : '⚠️ Stock CRÍTICO', { icon: '⚠️' });
      }
      setModal(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al registrar.');
    } finally { setEnviando(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  const TIPO_LABELS = {
    entrada_compra: { label: 'Compra', color: 'var(--success)' },
    entrada_devolucion: { label: 'Devolución', color: 'var(--success)' },
    entrada_ajuste: { label: 'Ajuste entrada', color: 'var(--info)' },
    traslado_entrada: { label: 'Traslado in', color: 'var(--info)' },
    salida_venta: { label: 'Venta', color: 'var(--text-muted)' },
    salida_reposicion: { label: 'Reposición', color: 'var(--warning)' },
    salida_baja: { label: 'Baja', color: 'var(--error)' },
    salida_ajuste: { label: 'Ajuste salida', color: 'var(--warning)' },
    traslado_salida: { label: 'Traslado out', color: 'var(--warning)' },
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <header style={{ height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <KiLogo size="sm" />
          <span style={{ color: 'var(--border)' }}>|</span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>🏭 Panel de Bodega</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{usuario?.nombre} — {usuario?.sucursal}</span>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.7rem', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Salir</button>
        </div>
      </header>

      <div style={{ padding: '1.5rem' }}>
        <PageHeader title="Gestión de Bodega" subtitle="Registra entradas, salidas y ajustes de inventario"
          actions={
            <>
              <Btn onClick={() => abrirModal('entrada')} size="sm" icon="📥">Registrar entrada</Btn>
              <Btn onClick={() => abrirModal('salida')} variant="secondary" size="sm" icon="📤">Registrar salida</Btn>
              <Btn onClick={() => abrirModal('ajuste')} variant="outline" size="sm" icon="🔧">Ajustar stock</Btn>
            </>
          }
        />

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <StatCard title="Total productos" value={resumen?.total_productos || '—'} icon="📦" color="var(--orange-primary)" loading={cargando} />
          <StatCard title="En stock" value={resumen?.en_stock || '—'} icon="✅" color="var(--success)" loading={cargando} />
          <StatCard title="Stock bajo" value={resumen?.stock_bajo || '—'} icon="⚠️" color="var(--warning)" loading={cargando} />
          <StatCard title="Agotados" value={resumen?.agotados || '—'} icon="❌" color="var(--error)" loading={cargando} />
          <StatCard title="Valor inventario" value={fmt(resumen?.valor_inventario)} icon="💰" color="var(--info)" loading={cargando} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
          {[['movimientos', '📋 Movimientos'], ['productos', '📦 Productos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'var(--transition)', background: tab === id ? 'var(--bg-surface)' : 'transparent', color: tab === id ? 'var(--orange-primary)' : 'var(--text-muted)', boxShadow: tab === id ? 'var(--shadow-sm)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Movimientos */}
        {tab === 'movimientos' && (
          <div className="ki-card">
            {cargando ? <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Cargando...</p> : movimientos.length === 0 ? (
              <EmptyState icon="📋" title="Sin movimientos registrados" />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ki-table">
                  <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Usuario</th><th>Referencia</th></tr></thead>
                  <tbody>
                    {movimientos.map(m => {
                      const tipo = TIPO_LABELS[m.tipo] || { label: m.tipo, color: 'var(--text-muted)' };
                      const esEntrada = m.tipo.startsWith('entrada') || m.tipo === 'traslado_entrada';
                      return (
                        <tr key={m.id_movimiento}>
                          <td style={{ fontSize: '11px' }}>{new Date(m.creado_en).toLocaleString('es-CO')}</td>
                          <td><span style={{ color: tipo.color, fontWeight: 600, fontSize: '12px' }}>{tipo.label}</span></td>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.producto}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: esEntrada ? 'var(--success)' : 'var(--error)' }}>
                            {esEntrada ? '+' : '-'}{m.cantidad}
                          </td>
                          <td><span className="mono">{m.stock_anterior}</span></td>
                          <td><span className="mono">{m.stock_nuevo}</span></td>
                          <td style={{ fontSize: '12px' }}>{m.usuario}</td>
                          <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.referencia || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Productos */}
        {tab === 'productos' && (
          <div className="ki-card" style={{ overflowX: 'auto' }}>
            <table className="ki-table">
              <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock</th><th>Mínimo</th><th>Estado</th></tr></thead>
              <tbody>
                {productos.map(p => (
                  <tr key={p.id_producto}>
                    <td><span className="mono">{p.codigo || '—'}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: p.stock_actual === 0 ? 'var(--error)' : p.stock_actual <= p.stock_minimo ? 'var(--warning)' : 'var(--success)' }}>{p.stock_actual}</span></td>
                    <td><span className="mono">{p.stock_minimo}</span></td>
                    <td><span className={`ki-badge ${p.estado_stock === 'normal' ? 'success' : p.estado_stock === 'bajo' ? 'warning' : 'error'}`}>{p.estado_stock}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal movimiento */}
      {modal && (
        <div className="ki-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="ki-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {modal === 'entrada' ? '📥 Registrar entrada' : modal === 'salida' ? '📤 Registrar salida' : '🔧 Ajustar stock'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <Select label="Producto" value={form.id_producto} onChange={e => setForm({ ...form, id_producto: e.target.value, stock_nuevo: productos.find(p => p.id_producto === parseInt(e.target.value))?.stock_actual || 0 })}>
                <option value="">Seleccionar producto...</option>
                {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre} — Stock: {p.stock_actual}</option>)}
              </Select>

              {modal !== 'ajuste' && (
                <Select label="Tipo de movimiento" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {(modal === 'entrada' ? TIPOS_ENTRADA : TIPOS_SALIDA).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              )}

              {modal !== 'ajuste' ? (
                <Input label="Cantidad" type="number" min={1} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              ) : (
                <Input label="Nuevo stock" type="number" min={0} value={form.stock_nuevo} onChange={e => setForm({ ...form, stock_nuevo: e.target.value })} />
              )}

              {modal === 'entrada' && <Input label="Costo unitario (opcional)" type="number" min={0} prefix="$" value={form.costo_unitario} onChange={e => setForm({ ...form, costo_unitario: e.target.value })} />}
              {modal === 'entrada' && <Input label="Referencia / N° orden" value={form.referencia} onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Ej: OC-2024-001" />}
              {modal === 'entrada' && <Input label="Proveedor (opcional)" value={form.proveedor} onChange={e => setForm({ ...form, proveedor: e.target.value })} />}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Notas / Motivo</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} style={{ resize: 'vertical' }} placeholder="Observaciones..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn loading={enviando} onClick={guardar}>Guardar</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

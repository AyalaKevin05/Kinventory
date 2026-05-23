import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getProductos, getMovimientos, registrarMovimiento,
  ajustarStock, getResumenInventario, getLotesProducto
} from '../../services/api';
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

/* ─── Componente de búsqueda de producto tipo-ahead ─── */
function BuscadorProducto({ onSeleccionar, placeholder = 'Buscar producto...' }) {
  const [busqueda, setBusqueda]   = useState('');
  const [resultados, setResult]   = useState([]);
  const [buscando, setBuscando]   = useState(false);
  const [abierto, setAbierto]     = useState(false);
  const debounceRef               = useRef(null);
  const inputRef                  = useRef(null);
  const wrapRef                   = useRef(null);

  const buscar = useCallback((texto) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto.trim()) { setResult([]); setBuscando(false); setAbierto(false); return; }
    setBuscando(true);
    setAbierto(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getProductos({ busqueda: texto.trim(), limit: 15 });
        setResult(res.data.data.productos);
      } catch { setResult([]); }
      finally { setBuscando(false); }
    }, 300);
  }, []);

  const seleccionar = (prod) => {
    setBusqueda('');
    setResult([]);
    setAbierto(false);
    onSeleccionar(prod);
  };

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
        <input
          ref={inputRef}
          value={busqueda}
          onChange={e => { setBusqueda(e.target.value); buscar(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter' && resultados.length === 1) seleccionar(resultados[0]); if (e.key === 'Escape') setAbierto(false); }}
          placeholder={placeholder}
          style={{ paddingLeft: '2.2rem', paddingRight: busqueda ? '2rem' : undefined }}
          autoComplete="off"
        />
        {busqueda && (
          <button onClick={() => { setBusqueda(''); setResult([]); setAbierto(false); inputRef.current?.focus(); }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: 0 }}>✕</button>
        )}
      </div>

      {/* Dropdown resultados */}
      {abierto && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', zIndex: 50, maxHeight: 280, overflowY: 'auto' }}>
          {buscando && <p style={{ padding: '0.75rem 1rem', fontSize: '12px', color: 'var(--text-muted)' }}>Buscando...</p>}
          {!buscando && resultados.length === 0 && busqueda && (
            <p style={{ padding: '0.75rem 1rem', fontSize: '12px', color: 'var(--text-muted)' }}>Sin resultados para "{busqueda}"</p>
          )}
          {resultados.map(p => (
            <button key={p.id_producto} onClick={() => seleccionar(p)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', gap: '0.75rem', transition: 'var(--transition)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{p.categoria}{p.codigo ? ` · ${p.codigo}` : ''}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: '12px', fontWeight: 700, color: p.stock_actual <= 0 ? 'var(--error)' : p.stock_actual <= p.stock_minimo ? 'var(--warning)' : 'var(--success)' }}>
                  Stock: {p.stock_actual}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Tarjeta de producto seleccionado ─── */
function ProductoSeleccionado({ prod, onLimpiar, lotes, fmt }) {
  const tieneVariosPrecios = lotes && lotes.length > 1 && lotes.some(l => parseFloat(l.precio_venta) !== parseFloat(lotes[0].precio_venta));

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--orange-primary)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>{prod.nombre}</p>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{prod.categoria}{prod.codigo ? ` · ${prod.codigo}` : ''}</p>
        </div>
        <button onClick={onLimpiar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', padding: 0 }}>✕</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stock actual</p>
          <p style={{ fontWeight: 700, fontSize: '1rem', color: prod.stock_actual <= 0 ? 'var(--error)' : prod.stock_actual <= prod.stock_minimo ? 'var(--warning)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}>{prod.stock_actual}</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P. compra</p>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{fmt(prod.precio_compra)}</p>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '0.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>P. venta</p>
          <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--orange-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(prod.precio_venta)}</p>
        </div>
      </div>

      {/* Lotes FIFO activos */}
      {lotes && lotes.length > 0 && (
        <div>
          <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
            🏷️ Lotes activos (FIFO)
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {lotes.map((l, i) => (
              <div key={l.id_lote} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', padding: '0.3rem 0.6rem', border: i === 0 ? '1px solid var(--orange-primary)' : '1px solid var(--border)' }}>
                <span style={{ fontSize: '11px', color: i === 0 ? 'var(--orange-primary)' : 'var(--text-muted)', fontWeight: i === 0 ? 700 : 400 }}>
                  {i === 0 ? '▶ Activo' : `Lote ${i + 1}`} · {l.cantidad_restante} uds
                </span>
                <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {fmt(l.precio_venta)}
                </span>
              </div>
            ))}
          </div>
          {tieneVariosPrecios && (
            <p style={{ fontSize: '10px', color: 'var(--info)', marginTop: '0.3rem' }}>
              ℹ️ Hay lotes con precios distintos. El vendedor verá el precio del lote activo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export default function Bodega() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab]             = useState('movimientos');
  const [movimientos, setMovimientos] = useState([]);
  const [resumen, setResumen]     = useState(null);
  const [modal, setModal]         = useState(null); // 'entrada' | 'salida' | 'ajuste'
  const [productoSel, setProductoSel] = useState(null);   // producto seleccionado en modal
  const [lotesActivos, setLotesActivos] = useState([]);   // lotes FIFO del producto
  const [cargandoLotes, setCargandoLotes] = useState(false);
  const [form, setForm]           = useState({
    cantidad: 1, tipo: '', referencia: '', proveedor: '',
    notas: '', costo_unitario: '', precio_venta_lote: '', stock_nuevo: 0
  });
  const [cargando, setCargando]   = useState(true);
  const [enviando, setEnviando]   = useState(false);

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  const cargar = async () => {
    setCargando(true);
    try {
      const [m, r] = await Promise.all([getMovimientos({ limit: 50 }), getResumenInventario()]);
      setMovimientos(m.data.data.movimientos);
      setResumen(r.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (tipo) => {
    setModal(tipo);
    setProductoSel(null);
    setLotesActivos([]);
    setForm({
      cantidad: 1,
      tipo: tipo === 'entrada' ? 'entrada_compra' : tipo === 'salida' ? 'salida_reposicion' : '',
      referencia: '', proveedor: '', notas: '', costo_unitario: '', precio_venta_lote: '', stock_nuevo: 0,
    });
  };

  /* Al seleccionar un producto, cargar sus lotes FIFO */
  const onSeleccionarProducto = async (prod) => {
    setProductoSel(prod);
    setForm(prev => ({ ...prev, stock_nuevo: prod.stock_actual, precio_venta_lote: String(prod.precio_venta) }));
    if (modal === 'entrada') {
      setCargandoLotes(true);
      try {
        const res = await getLotesProducto(prod.id_producto);
        setLotesActivos(res.data.data?.lotes || []);
      } catch { setLotesActivos([]); }
      finally { setCargandoLotes(false); }
    }
  };

  /* Indicador de cambio de precio */
  const calcCambioPrecio = () => {
    if (!productoSel || !form.precio_venta_lote) return null;
    const nuevo = parseFloat(form.precio_venta_lote);
    const actual = parseFloat(productoSel.precio_venta);
    if (isNaN(nuevo) || nuevo === actual) return null;
    const diff = ((nuevo - actual) / actual * 100).toFixed(1);
    return { diff, sube: nuevo > actual };
  };

  const cambioPrecio = calcCambioPrecio();

  const guardar = async () => {
    if (!productoSel) return toast.error('Selecciona un producto.');
    setEnviando(true);
    try {
      if (modal === 'ajuste') {
        await ajustarStock({ id_producto: productoSel.id_producto, stock_nuevo: parseInt(form.stock_nuevo), motivo: form.notas });
        toast.success('Stock ajustado correctamente.');
      } else {
        const payload = {
          id_producto: productoSel.id_producto,
          tipo: form.tipo,
          cantidad: parseInt(form.cantidad),
          costo_unitario: parseFloat(form.costo_unitario) || 0,
          referencia: form.referencia || null,
          proveedor: form.proveedor || null,
          notas: form.notas || null,
        };
        // Solo enviar precio_venta_lote en entradas
        if (modal === 'entrada' && form.precio_venta_lote) {
          payload.precio_venta_lote = parseFloat(form.precio_venta_lote);
        }
        const { data } = await registrarMovimiento(payload);
        toast.success(data.mensaje);
        if (data.data?.alerta === 'AGOTADO') toast('⚠️ Producto AGOTADO', { icon: '⚠️' });
        else if (data.data?.alerta === 'CRITICO') toast('⚠️ Stock CRÍTICO', { icon: '⚠️' });
      }
      setModal(null);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al registrar.');
    } finally { setEnviando(false); }
  };

  const TIPO_LABELS = {
    entrada_compra:    { label: 'Compra',         color: 'var(--success)' },
    entrada_devolucion:{ label: 'Devolución',      color: 'var(--success)' },
    entrada_ajuste:    { label: 'Ajuste entrada',  color: 'var(--info)' },
    traslado_entrada:  { label: 'Traslado in',     color: 'var(--info)' },
    salida_venta:      { label: 'Venta',           color: 'var(--text-muted)' },
    salida_reposicion: { label: 'Reposición',      color: 'var(--warning)' },
    salida_baja:       { label: 'Baja',            color: 'var(--error)' },
    salida_ajuste:     { label: 'Ajuste salida',   color: 'var(--warning)' },
    traslado_salida:   { label: 'Traslado out',    color: 'var(--warning)' },
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
          <button onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.3rem 0.7rem', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
            Salir
          </button>
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
          <StatCard title="En stock"        value={resumen?.en_stock || '—'}        icon="✅" color="var(--success)"        loading={cargando} />
          <StatCard title="Stock bajo"      value={resumen?.stock_bajo || '—'}      icon="⚠️" color="var(--warning)"        loading={cargando} />
          <StatCard title="Agotados"        value={resumen?.agotados || '—'}        icon="❌" color="var(--error)"          loading={cargando} />
          <StatCard title="Valor inventario" value={fmt(resumen?.valor_inventario)} icon="💰" color="var(--info)"          loading={cargando} />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
          {[['movimientos', '📋 Movimientos recientes']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'var(--transition)', background: tab === id ? 'var(--bg-surface)' : 'transparent', color: tab === id ? 'var(--orange-primary)' : 'var(--text-muted)', boxShadow: tab === id ? 'var(--shadow-sm)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Tabla movimientos */}
        <div className="ki-card">
          {cargando ? <p style={{ color: 'var(--text-muted)', padding: '1rem' }}>Cargando...</p> : movimientos.length === 0 ? (
            <EmptyState icon="📋" title="Sin movimientos registrados" />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ki-table">
                <thead>
                  <tr>
                    <th>Fecha</th><th>Tipo</th><th>Producto</th>
                    <th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th>
                    <th>Usuario</th><th>Referencia</th>
                  </tr>
                </thead>
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
      </div>

      {/* ════ Modal movimiento ════ */}
      {modal && (
        <div className="ki-overlay" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="ki-modal" style={{ maxWidth: 520 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)' }}>
                {modal === 'entrada' ? '📥 Registrar entrada' : modal === 'salida' ? '📤 Registrar salida' : '🔧 Ajustar stock'}
              </h3>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

              {/* Búsqueda de producto */}
              {!productoSel ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                    Producto *
                  </label>
                  <BuscadorProducto
                    onSeleccionar={onSeleccionarProducto}
                    placeholder="Buscar por nombre, código o código de barras..."
                  />
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                    Producto seleccionado
                  </label>
                  {cargandoLotes
                    ? <div className="ki-skeleton" style={{ height: 80 }} />
                    : <ProductoSeleccionado prod={productoSel} onLimpiar={() => { setProductoSel(null); setLotesActivos([]); }} lotes={lotesActivos} fmt={fmt} />
                  }
                </div>
              )}

              {/* Tipo de movimiento */}
              {modal !== 'ajuste' && (
                <Select label="Tipo de movimiento" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {(modal === 'entrada' ? TIPOS_ENTRADA : TIPOS_SALIDA).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </Select>
              )}

              {/* Cantidad */}
              {modal !== 'ajuste' ? (
                <Input label="Cantidad" type="number" min={1} value={form.cantidad} onChange={e => setForm({ ...form, cantidad: e.target.value })} />
              ) : (
                <Input label="Nuevo stock total" type="number" min={0} value={form.stock_nuevo} onChange={e => setForm({ ...form, stock_nuevo: e.target.value })} />
              )}

              {/* Campos exclusivos de entrada */}
              {modal === 'entrada' && (
                <>
                  <Input label="Costo unitario de compra ($)" type="number" min={0} value={form.costo_unitario}
                    onChange={e => setForm({ ...form, costo_unitario: e.target.value })}
                    placeholder={productoSel ? String(productoSel.precio_compra) : '0'} />

                  {/* Campo precio de venta del lote con indicador de cambio */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                        Precio de venta para este lote ($)
                      </label>
                      {cambioPrecio && (
                        <span style={{
                          fontSize: '11px', fontWeight: 700, padding: '0.15rem 0.5rem',
                          borderRadius: '99px',
                          background: cambioPrecio.sube ? 'var(--error-dim)' : 'var(--success-dim)',
                          color: cambioPrecio.sube ? 'var(--error)' : 'var(--success)',
                        }}>
                          {cambioPrecio.sube ? '↑' : '↓'} {Math.abs(cambioPrecio.diff)}%
                        </span>
                      )}
                    </div>
                    <input
                      type="number" min={0}
                      value={form.precio_venta_lote}
                      onChange={e => setForm({ ...form, precio_venta_lote: e.target.value })}
                      placeholder={productoSel ? String(productoSel.precio_venta) : '0'}
                      style={{ width: '100%', borderColor: cambioPrecio ? (cambioPrecio.sube ? 'var(--error)' : 'var(--success)') : undefined }}
                    />
                    {cambioPrecio && productoSel && (
                      <p style={{ fontSize: '11px', marginTop: '0.3rem', color: 'var(--text-muted)' }}>
                        Precio anterior: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{fmt(productoSel.precio_venta)}</strong>
                        {' '}→ Nuevo lote a: <strong style={{ fontFamily: 'var(--font-mono)', color: cambioPrecio.sube ? 'var(--error)' : 'var(--success)' }}>{fmt(form.precio_venta_lote)}</strong>
                      </p>
                    )}
                    {!cambioPrecio && productoSel && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        = Sin cambio de precio. Se agrega al lote existente.
                      </p>
                    )}
                  </div>

                  <Input label="Referencia / N° orden de compra" value={form.referencia}
                    onChange={e => setForm({ ...form, referencia: e.target.value })} placeholder="Ej: OC-2024-001" />
                  <Input label="Proveedor (opcional)" value={form.proveedor}
                    onChange={e => setForm({ ...form, proveedor: e.target.value })} />
                </>
              )}

              {/* Notas */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Notas / Motivo</label>
                <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })}
                  rows={2} style={{ resize: 'vertical' }} placeholder="Observaciones..." />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <Btn variant="secondary" onClick={() => setModal(null)}>Cancelar</Btn>
              <Btn loading={enviando} onClick={guardar} disabled={!productoSel}>
                {modal === 'entrada' ? '📥 Registrar entrada' : modal === 'salida' ? '📤 Registrar salida' : '🔧 Ajustar stock'}
              </Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

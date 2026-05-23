import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProductos, getClientes, crearVenta, getFactura } from '../../services/api';
import { KiLogo, Btn } from '../../components/common';
import toast from 'react-hot-toast';

/* ─── Estilos de impresión (inyectados en <head>) ─── */
const PRINT_STYLES = `
@media print {
  body > *:not(#ki-factura-print) { display: none !important; }
  #ki-factura-print { display: block !important; position: fixed; inset: 0; background: #fff; z-index: 9999; padding: 2rem; }
  .no-print { display: none !important; }
}
`;

export default function POS() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  /* ── State ── */
  const [resultados, setResultados]     = useState([]);
  const [clientes, setClientes]         = useState([]);
  const [carrito, setCarrito]           = useState([]);
  const [busqueda, setBusqueda]         = useState('');
  const [idCliente, setIdCliente]       = useState('');
  const [metodoPago, setMetodoPago]     = useState('efectivo');
  const [descuento, setDescuento]       = useState(0);
  const [procesando, setProcesando]     = useState(false);
  const [buscando, setBuscando]         = useState(false);
  const [factura, setFactura]           = useState(null);   // datos de factura generada
  const [verFactura, setVerFactura]     = useState(false);  // modal factura

  const busquedaRef = useRef(null);
  const debounceRef = useRef(null);

  /* ── Carga inicial ── */
  useEffect(() => {
    // Inyectar estilos de impresión
    const style = document.createElement('style');
    style.innerHTML = PRINT_STYLES;
    document.head.appendChild(style);
    getClientes().then(r => setClientes(r.data.data)).catch(() => {});
    busquedaRef.current?.focus();
    return () => document.head.removeChild(style);
  }, []);

  /* ── Búsqueda con debounce ── */
  const buscarProductos = useCallback((texto) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!texto.trim()) { setResultados([]); setBuscando(false); return; }
    setBuscando(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await getProductos({ busqueda: texto.trim(), limit: 20 });
        setResultados(res.data.data.productos);
      } catch { setResultados([]); }
      finally { setBuscando(false); }
    }, 350);
  }, []);

  const handleBusqueda = (e) => { setBusqueda(e.target.value); buscarProductos(e.target.value); };

  const limpiarBusqueda = () => { setBusqueda(''); setResultados([]); busquedaRef.current?.focus(); };

  /* ── Carrito ── */
  const agregar = (prod) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.id_producto === prod.id_producto);
      if (ex) {
        if (ex.cantidad >= prod.stock_actual) { toast.error(`Stock máximo: ${prod.stock_actual}`); return prev; }
        return prev.map(i => i.id_producto === prod.id_producto ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    limpiarBusqueda();
  };

  const cambiarCant = (id, v) => {
    const n = parseInt(v) || 1;
    const prod = carrito.find(i => i.id_producto === id);
    setCarrito(prev => prev.map(i => i.id_producto === id ? { ...i, cantidad: Math.max(1, Math.min(n, prod.stock_actual)) } : i));
  };

  const quitar = (id) => setCarrito(prev => prev.filter(i => i.id_producto !== id));

  /* ── Totales ── */
  const tasa_iva = usuario?.tasa_iva || 19;
  const subtotal = carrito.reduce((a, i) => a + parseFloat(i.precio_venta) * i.cantidad, 0);
  const impuesto = carrito.reduce((a, i) => i.aplica_iva ? a + parseFloat(i.precio_venta) * i.cantidad * tasa_iva / 100 : a, 0);
  const total    = subtotal + impuesto - descuento;
  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  /* ── Procesar venta y obtener factura ── */
  const procesar = async () => {
    if (!carrito.length) return toast.error('Agrega al menos un producto.');
    setProcesando(true);
    try {
      const { data } = await crearVenta({
        items: carrito.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
        id_cliente: idCliente || null,
        metodo_pago: metodoPago,
        descuento,
      });
      const ventaData = data.data;
      // Intentar obtener factura completa
      let facturaData = null;
      try {
        const fr = await getFactura(ventaData.id_factura || ventaData.id_venta);
        facturaData = fr.data.data;
      } catch {
        // Fallback: construir desde datos de venta + carrito
        facturaData = {
          numero_factura: ventaData.numero_factura,
          id_venta: ventaData.id_venta,
          fecha: new Date().toISOString(),
          cliente: clientes.find(c => String(c.id_cliente) === String(idCliente)) || null,
          vendedor: usuario?.nombre,
          sucursal: usuario?.sucursal,
          metodo_pago: metodoPago,
          items: carrito.map(i => ({
            nombre: i.nombre,
            cantidad: i.cantidad,
            precio_unitario: parseFloat(i.precio_venta),
            subtotal: parseFloat(i.precio_venta) * i.cantidad,
          })),
          subtotal,
          impuesto,
          descuento,
          total,
        };
      }
      setFactura(facturaData);
      setCarrito([]);
      setDescuento(0);
      setIdCliente('');
      setVerFactura(true);
      toast.success(`✅ Venta #${ventaData.id_venta} completada`);
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al procesar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  const imprimirFactura = () => window.print();

  const METODOS = [
    { id: 'efectivo',       label: '💵 Efectivo' },
    { id: 'tarjeta',        label: '💳 Tarjeta' },
    { id: 'nequi',          label: '📱 Nequi' },
    { id: 'daviplata',      label: '📱 Daviplata' },
    { id: 'transferencia',  label: '🏦 Transferencia' },
  ];

  /* ════════════════ RENDER ════════════════ */
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>

      {/* ── Header ── */}
      <header style={{ height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0 }}>
        <KiLogo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{usuario?.nombre}</p>
            <p style={{ fontSize: '10px', color: 'var(--orange-primary)' }}>Vendedor • {usuario?.sucursal}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
            Salir
          </button>
        </div>
      </header>

      {/* ── Body: dos columnas ── */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>

        {/* ════ Columna izquierda: Búsqueda + resultados ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

          {/* Barra de búsqueda */}
          <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: '15px', pointerEvents: 'none' }}>🔍</span>
              <input
                ref={busquedaRef}
                id="pos-busqueda"
                placeholder="Buscar producto por nombre, código o código de barras..."
                value={busqueda}
                onChange={handleBusqueda}
                onKeyDown={e => { if (e.key === 'Enter' && resultados.length === 1) agregar(resultados[0]); }}
                style={{ paddingLeft: '2.25rem', paddingRight: busqueda ? '2.5rem' : undefined }}
              />
              {busqueda && (
                <button
                  onClick={limpiarBusqueda}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px', lineHeight: 1, cursor: 'pointer', padding: 0 }}>
                  ✕
                </button>
              )}
            </div>
            {buscando && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>Buscando...</p>
            )}
            {busqueda && !buscando && (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''} para "{busqueda}"
              </p>
            )}
          </div>

          {/* Área principal */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column' }}>

            {/* Estado vacío — sin búsqueda activa */}
            {!busqueda.trim() && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3.5rem', opacity: 0.4 }}>🔍</div>
                <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Busca un producto para comenzar</p>
                <p style={{ fontSize: '12px' }}>Escribe el nombre, código o código de barras del producto en la barra de arriba</p>
              </div>
            )}

            {/* Sin resultados */}
            {busqueda.trim() && !buscando && resultados.length === 0 && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--text-muted)', textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', opacity: 0.4 }}>📦</div>
                <p style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Sin resultados</p>
                <p style={{ fontSize: '12px' }}>No se encontraron productos para "{busqueda}"</p>
              </div>
            )}

            {/* Grid de resultados */}
            {resultados.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem', alignContent: 'start' }}>
                {resultados.map(p => (
                  <button
                    key={p.id_producto}
                    onClick={() => agregar(p)}
                    disabled={p.stock_actual <= 0}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '0.875rem',
                      cursor: p.stock_actual > 0 ? 'pointer' : 'not-allowed',
                      textAlign: 'left',
                      transition: 'var(--transition)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      opacity: p.stock_actual <= 0 ? 0.5 : 1,
                    }}
                    onMouseEnter={e => { if (p.stock_actual > 0) { e.currentTarget.style.borderColor = 'var(--orange-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--orange-dim)'; } }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.nombre}</p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.categoria}</p>
                    <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--orange-primary)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>{fmt(p.precio_venta)}</p>
                    <p style={{ fontSize: '10px', color: p.stock_actual <= (p.stock_minimo || 0) ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {p.stock_actual <= 0 ? '❌ Sin stock' : `Stock: ${p.stock_actual}`}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ Columna derecha: Carrito ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>

          {/* Header carrito */}
          <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>🛒 Orden ({carrito.length})</p>
              {carrito.length > 0 && (
                <button onClick={() => setCarrito([])} style={{ background: 'var(--error-dim)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', fontSize: '11px', cursor: 'pointer' }}>
                  Vaciar
                </button>
              )}
            </div>
          </div>

          {/* Items del carrito */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {carrito.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '2rem' }}>🛒</p>
                <p style={{ fontSize: '12px', marginTop: '0.5rem' }}>El carrito está vacío</p>
                <p style={{ fontSize: '11px', marginTop: '0.25rem' }}>Busca y selecciona productos</p>
              </div>
            ) : carrito.map(item => (
              <div key={item.id_producto} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: 'var(--radius-md)', marginBottom: '0.25rem', background: 'var(--bg-elevated)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</p>
                  <p style={{ fontSize: '11px', color: 'var(--orange-primary)', fontFamily: 'var(--font-mono)' }}>{fmt(item.precio_venta)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <button onClick={() => cambiarCant(item.id_producto, item.cantidad - 1)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <input type="number" value={item.cantidad} onChange={e => cambiarCant(item.id_producto, e.target.value)} style={{ width: 36, textAlign: 'center', padding: '0.15rem', fontSize: '13px', fontWeight: 700 }} />
                  <button onClick={() => cambiarCant(item.id_producto, item.cantidad + 1)} style={{ width: 22, height: 22, borderRadius: 'var(--radius-sm)', background: 'var(--bg-hover)', border: 'none', color: 'var(--text-primary)', fontWeight: 700, cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'right' }}>{fmt(item.precio_venta * item.cantidad)}</p>
                <button onClick={() => quitar(item.id_producto)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '1rem', padding: 0, lineHeight: 1 }}>✕</button>
              </div>
            ))}
          </div>

          {/* Footer: configuración + totales + acción */}
          <div style={{ padding: '0.875rem', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

            {/* Cliente */}
            <select value={idCliente} onChange={e => setIdCliente(e.target.value)} style={{ fontSize: '12px', padding: '0.45rem 0.75rem' }}>
              <option value="">Cliente General</option>
              {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre} {c.apellido || ''}</option>)}
            </select>

            {/* Método de pago */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.3rem' }}>
              {METODOS.map(m => (
                <button key={m.id} onClick={() => setMetodoPago(m.id)}
                  style={{ padding: '0.35rem', fontSize: '10px', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer', transition: 'var(--transition)', background: metodoPago === m.id ? 'var(--orange-dim)' : 'var(--bg-elevated)', color: metodoPago === m.id ? 'var(--orange-primary)' : 'var(--text-muted)', borderColor: metodoPago === m.id ? 'var(--orange-primary)' : 'var(--border)' }}>
                  {m.label}
                </button>
              ))}
            </div>

            {/* Descuento */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Descuento $</label>
              <input type="number" min="0" value={descuento} onChange={e => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                style={{ padding: '0.3rem 0.5rem', fontSize: '12px', fontFamily: 'var(--font-mono)' }} />
            </div>

            {/* Totales */}
            <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[['Subtotal', fmt(subtotal)], [`IVA (${tasa_iva}%)`, fmt(impuesto)], ['Descuento', `-${fmt(descuento)}`]].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l}</span>
                  <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: l === 'Descuento' ? 'var(--success)' : 'var(--text-secondary)' }}>{v}</span>
                </div>
              ))}
              <div className="ki-divider" style={{ margin: '0.25rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>TOTAL</span>
                <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--orange-primary)', fontSize: '1.1rem' }}>{fmt(total)}</span>
              </div>
            </div>

            {/* Botón cobrar */}
            <Btn fullWidth size="lg" loading={procesando} onClick={procesar} disabled={!carrito.length}
              style={{ boxShadow: carrito.length ? 'var(--shadow-orange)' : 'none', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
              ✅ Cobrar {carrito.length > 0 ? fmt(total) : ''}
            </Btn>

            {/* Botón ver última factura */}
            {factura && (
              <button
                onClick={() => setVerFactura(true)}
                style={{ background: 'var(--info-dim)', color: 'var(--info)', border: '1px solid var(--info)', borderRadius: 'var(--radius-md)', padding: '0.45rem', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                🧾 Ver última factura — {factura.numero_factura}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ════ Modal Factura ════ */}
      {verFactura && factura && (
        <div className="ki-overlay" onClick={() => setVerFactura(false)}>
          <div
            id="ki-factura-print"
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', color: '#111', borderRadius: 12, padding: '2rem', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', animation: 'fadeIn 0.2s ease' }}>

            {/* Encabezado factura */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '2px dashed #ddd' }}>
              <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'Sora, sans-serif', letterSpacing: '-0.5px', color: '#FF6B35' }}>KINVENTORY</p>
              <p style={{ fontSize: '11px', color: '#666', marginTop: 2 }}>{usuario?.sucursal || 'Sucursal Principal'}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, marginTop: '0.75rem', color: '#111' }}>FACTURA DE VENTA</p>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#FF6B35', fontFamily: 'JetBrains Mono, monospace', marginTop: 4 }}>{factura.numero_factura}</p>
            </div>

            {/* Info venta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', fontSize: '12px', marginBottom: '1rem' }}>
              {[
                ['Venta #', factura.id_venta],
                ['Fecha', new Date(factura.fecha || factura.fecha_venta || Date.now()).toLocaleString('es-CO')],
                ['Vendedor', factura.vendedor || usuario?.nombre],
                ['Método pago', (factura.metodo_pago || metodoPago)?.replace('_', ' ')],
                ['Cliente', factura.cliente ? `${factura.cliente.nombre} ${factura.cliente.apellido || ''}` : 'General'],
              ].map(([l, v]) => (
                <div key={l}>
                  <span style={{ color: '#999', fontSize: '10px', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</span>
                  <span style={{ fontWeight: 600, color: '#111' }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Tabla de items */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '1rem' }}>
              <thead>
                <tr style={{ background: '#f5f5f5' }}>
                  {['Producto', 'Cant.', 'P. Unit.', 'Total'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 0.4rem', textAlign: h === 'Producto' ? 'left' : 'right', fontSize: '10px', color: '#666', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #ddd' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(factura.items || factura.detalle || carrito.map(i => ({
                  nombre: i.nombre,
                  cantidad: i.cantidad,
                  precio_unitario: parseFloat(i.precio_venta),
                  subtotal: parseFloat(i.precio_venta) * i.cantidad,
                }))).map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '0.5rem 0.4rem', color: '#111', fontWeight: 500 }}>{item.nombre || item.producto}</td>
                    <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: '#555' }}>{item.cantidad}</td>
                    <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', color: '#555', fontFamily: 'monospace' }}>{fmt(item.precio_unitario || item.precio_venta)}</td>
                    <td style={{ padding: '0.5rem 0.4rem', textAlign: 'right', fontWeight: 700, color: '#111', fontFamily: 'monospace' }}>{fmt(item.subtotal || item.total_item)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales factura */}
            <div style={{ borderTop: '2px dashed #ddd', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '13px' }}>
              {[
                ['Subtotal', fmt(factura.subtotal ?? subtotal)],
                [`IVA (${tasa_iva}%)`, fmt(factura.impuesto ?? factura.iva ?? impuesto)],
                ['Descuento', `-${fmt(factura.descuento ?? descuento)}`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>{l}</span>
                  <span style={{ fontFamily: 'monospace' }}>{v}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #ccc' }}>
                <span style={{ fontWeight: 800, fontSize: '15px' }}>TOTAL</span>
                <span style={{ fontWeight: 800, fontSize: '15px', color: '#FF6B35', fontFamily: 'monospace' }}>{fmt(factura.total ?? total)}</span>
              </div>
            </div>

            {/* Pie */}
            <p style={{ textAlign: 'center', fontSize: '11px', color: '#999', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed #ddd' }}>
              ¡Gracias por su compra! — Kinventory
            </p>

            {/* Botones acción */}
            <div className="no-print" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={imprimirFactura}
                style={{ flex: 1, background: '#FF6B35', color: '#fff', border: 'none', borderRadius: 8, padding: '0.65rem', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setVerFactura(false)}
                style={{ flex: 1, background: '#f0f0f0', color: '#333', border: 'none', borderRadius: 8, padding: '0.65rem', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

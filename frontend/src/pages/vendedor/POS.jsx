import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProductos, getClientes, crearVenta } from '../../services/api';
import { KiLogo, Btn } from '../../components/common';
import toast from 'react-hot-toast';

export default function POS() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [productos, setProductos]   = useState([]);
  const [clientes, setClientes]     = useState([]);
  const [carrito, setCarrito]       = useState([]);
  const [busqueda, setBusqueda]     = useState('');
  const [idCliente, setIdCliente]   = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [descuento, setDescuento]   = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [ultimaVenta, setUltimaVenta] = useState(null);
  const [categoriaActiva, setCategoriaActiva] = useState('');
  const [categorias, setCategorias] = useState([]);
  const busquedaRef = useRef(null);

  useEffect(() => {
    Promise.all([getProductos({ limit: 200 }), getClientes()])
      .then(([p, c]) => {
        setProductos(p.data.data.productos);
        setClientes(c.data.data);
        const cats = [...new Set(p.data.data.productos.map(x => x.categoria))].filter(Boolean);
        setCategorias(cats);
      });
    busquedaRef.current?.focus();
  }, []);

  const tasa_iva = usuario?.tasa_iva || 19;

  const filtrados = productos.filter(p => {
    const matchBusq = !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || p.codigo?.includes(busqueda) || p.codigo_barras?.includes(busqueda);
    const matchCat  = !categoriaActiva || p.categoria === categoriaActiva;
    return matchBusq && matchCat && p.stock_actual > 0;
  });

  const agregar = (prod) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.id_producto === prod.id_producto);
      if (ex) {
        if (ex.cantidad >= prod.stock_actual) { toast.error(`Stock máximo: ${prod.stock_actual}`); return prev; }
        return prev.map(i => i.id_producto === prod.id_producto ? { ...i, cantidad: i.cantidad + 1 } : i);
      }
      return [...prev, { ...prod, cantidad: 1 }];
    });
    setBusqueda('');
    busquedaRef.current?.focus();
  };

  const cambiarCant = (id, v) => {
    const n = parseInt(v) || 1;
    const prod = carrito.find(i => i.id_producto === id);
    setCarrito(prev => prev.map(i => i.id_producto === id ? { ...i, cantidad: Math.max(1, Math.min(n, prod.stock_actual)) } : i));
  };

  const quitar = (id) => setCarrito(prev => prev.filter(i => i.id_producto !== id));

  const subtotal = carrito.reduce((a, i) => a + parseFloat(i.precio_venta) * i.cantidad, 0);
  const impuesto = carrito.reduce((a, i) => i.aplica_iva ? a + parseFloat(i.precio_venta) * i.cantidad * tasa_iva / 100 : a, 0);
  const total    = subtotal + impuesto - descuento;

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);

  const procesar = async () => {
    if (!carrito.length) return toast.error('Agrega productos al carrito.');
    setProcesando(true);
    try {
      const { data } = await crearVenta({
        items: carrito.map(i => ({ id_producto: i.id_producto, cantidad: i.cantidad })),
        id_cliente: idCliente || null,
        metodo_pago: metodoPago,
        descuento,
      });
      setUltimaVenta(data.data);
      setCarrito([]);
      setDescuento(0);
      setIdCliente('');
      toast.success(`✅ Venta #${data.data.id_venta} — ${data.data.numero_factura}`);
      getProductos({ limit: 200 }).then(p => setProductos(p.data.data.productos));
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al procesar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  const METODOS = [
    { id: 'efectivo', label: '💵 Efectivo' },
    { id: 'tarjeta', label: '💳 Tarjeta' },
    { id: 'nequi', label: '📱 Nequi' },
    { id: 'daviplata', label: '📱 Daviplata' },
    { id: 'transferencia', label: '🏦 Transferencia' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-body)' }}>
      {/* Header */}
      <header style={{ height: 52, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', flexShrink: 0 }}>
        <KiLogo size="sm" />
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{usuario?.nombre}</p>
            <p style={{ fontSize: '10px', color: 'var(--orange-primary)' }}>Vendedor • {usuario?.sucursal}</p>
          </div>
          <button onClick={() => { logout(); navigate('/login'); }} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>Salir</button>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 360px', overflow: 'hidden' }}>
        {/* Catálogo */}
        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>
          {/* Search + filtros */}
          <div style={{ padding: '0.875rem', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <input
              ref={busquedaRef}
              style={{ marginBottom: '0.5rem' }}
              placeholder="🔍 Buscar por nombre, código o código de barras..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && filtrados.length === 1) agregar(filtrados[0]); }}
            />
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              <button onClick={() => setCategoriaActiva('')}
                style={{ padding: '0.25rem 0.7rem', borderRadius: '99px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: !categoriaActiva ? 'var(--orange-primary)' : 'var(--bg-elevated)', color: !categoriaActiva ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', transition: 'var(--transition)' }}>
                Todos
              </button>
              {categorias.map(c => (
                <button key={c} onClick={() => setCategoriaActiva(c === categoriaActiva ? '' : c)}
                  style={{ padding: '0.25rem 0.7rem', borderRadius: '99px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', background: categoriaActiva === c ? 'var(--orange-primary)' : 'var(--bg-elevated)', color: categoriaActiva === c ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)', transition: 'var(--transition)' }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Grid productos */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.625rem', alignContent: 'start' }}>
            {filtrados.map(p => (
              <button key={p.id_producto} onClick={() => agregar(p)}
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '0.875rem', cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--orange-primary)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--orange-dim)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{p.nombre}</p>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.categoria}</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--orange-primary)', fontFamily: 'var(--font-mono)', marginTop: '0.25rem' }}>{fmt(p.precio_venta)}</p>
                <p style={{ fontSize: '10px', color: p.stock_actual <= p.stock_minimo ? 'var(--warning)' : 'var(--text-muted)' }}>Stock: {p.stock_actual}</p>
              </button>
            ))}
            {filtrados.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '2rem' }}>🔍</p>
                <p style={{ marginTop: '0.5rem' }}>Sin productos</p>
              </div>
            )}
          </div>
        </div>

        {/* Carrito */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)', overflow: 'hidden' }}>
          {/* Header carrito */}
          <div style={{ padding: '0.875rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>🛒 Orden ({carrito.length})</p>
              {carrito.length > 0 && <button onClick={() => setCarrito([])} style={{ background: 'var(--error-dim)', color: 'var(--error)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.5rem', fontSize: '11px', cursor: 'pointer' }}>Vaciar</button>}
            </div>
          </div>

          {/* Items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
            {carrito.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '1.75rem' }}>🛒</p>
                <p style={{ fontSize: '12px', marginTop: '0.5rem' }}>Toca un producto para agregarlo</p>
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

          {/* Footer carrito */}
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

            <Btn fullWidth size="lg" loading={procesando} onClick={procesar} disabled={!carrito.length}
              style={{ boxShadow: carrito.length ? 'var(--shadow-orange)' : 'none', fontSize: '1rem', fontFamily: 'var(--font-display)' }}>
              ✅ Cobrar {carrito.length > 0 ? fmt(total) : ''}
            </Btn>

            {ultimaVenta && (
              <div style={{ background: 'var(--success-dim)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: '0.6rem', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>✅ Venta #{ultimaVenta.id_venta} completada</p>
                <p style={{ fontSize: '10px', color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{ultimaVenta.numero_factura}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getVentas, getVenta, cancelarVenta } from '../../services/api';
import { PageHeader, Btn, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

const METODO_LABELS = { efectivo:'💵 Efectivo', tarjeta:'💳 Tarjeta', nequi:'📱 Nequi', daviplata:'📱 Daviplata', transferencia:'🏦 Transferencia', credito:'📋 Crédito' };
const ESTADO_COLOR  = { completada:'success', cancelada:'error', pendiente:'warning', devuelta:'muted' };

export default function Ventas() {
  const [ventas, setVentas]       = useState([]);
  const [total, setTotal]         = useState(0);
  const [detalle, setDetalle]     = useState(null);
  const [cargando, setCargando]   = useState(true);
  const [desde, setDesde]         = useState('');
  const [hasta, setHasta]         = useState('');
  const [estado, setEstado]       = useState('');
  const [page, setPage]           = useState(1);
  const LIMIT = 20;

  const cargar = async () => {
    setCargando(true);
    try {
      const { data } = await getVentas({ desde, hasta, estado, page, limit: LIMIT });
      setVentas(data.data.ventas);
      setTotal(data.data.total);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [desde, hasta, estado, page]);

  const verDetalle = async (id) => {
    if (detalle?.id_venta === id) { setDetalle(null); return; }
    const { data } = await getVenta(id);
    setDetalle(data.data);
  };

  const cancelar = async (id) => {
    if (!window.confirm('¿Cancelar esta venta?')) return;
    try { await cancelarVenta(id); toast.success('Venta cancelada.'); cargar(); setDetalle(null); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'No se puede cancelar.'); }
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);
  const totalIngresos = ventas.filter(v => v.estado === 'completada').reduce((a, v) => a + parseFloat(v.total || 0), 0);

  return (
    <div>
      <PageHeader title="Ventas" subtitle={`${total} ventas registradas`} />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Desde</label>
          <input type="date" style={{ width: 'auto' }} value={desde} onChange={e => { setDesde(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>Hasta</label>
          <input type="date" style={{ width: 'auto' }} value={hasta} onChange={e => { setHasta(e.target.value); setPage(1); }} />
        </div>
        <select style={{ width: 'auto' }} value={estado} onChange={e => { setEstado(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          <option value="completada">Completadas</option>
          <option value="cancelada">Canceladas</option>
          <option value="pendiente">Pendientes</option>
        </select>
        {(desde || hasta || estado) && <Btn variant="ghost" size="sm" onClick={() => { setDesde(''); setHasta(''); setEstado(''); setPage(1); }}>✕ Limpiar</Btn>}
      </div>

      {/* Resumen rápido */}
      {ventas.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {[
            ['Ventas completadas', ventas.filter(v => v.estado === 'completada').length, 'var(--success)'],
            ['Ingresos filtrados', fmt(totalIngresos), 'var(--orange-primary)'],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1.25rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: c, fontFamily: 'var(--font-mono)' }}>{v}</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      <div className="ki-card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ki-table">
            <thead><tr><th>#</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Método</th><th>Total</th><th>Estado</th><th>Factura</th><th></th></tr></thead>
            <tbody>
              {cargando ? [1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6,7,8,9].map(j => <td key={j}><Skeleton h={16}/></td>)}</tr>) :
              ventas.length === 0 ? <tr><td colSpan="9"><EmptyState icon="🧾" title="Sin ventas" /></td></tr> :
              ventas.map(v => (
                <>
                  <tr key={v.id_venta} style={{ cursor: 'pointer' }} onClick={() => verDetalle(v.id_venta)}>
                    <td><span className="mono" style={{ color: 'var(--orange-primary)' }}>#{v.id_venta}</span></td>
                    <td style={{ fontSize: '12px' }}>{new Date(v.fecha).toLocaleString('es-CO')}</td>
                    <td>{v.cliente?.trim() || <span style={{ color: 'var(--text-muted)' }}>General</span>}</td>
                    <td style={{ fontSize: '12px' }}>{v.vendedor}</td>
                    <td style={{ fontSize: '12px' }}>{METODO_LABELS[v.metodo_pago] || v.metodo_pago}</td>
                    <td><span className="mono" style={{ fontWeight: 700, color: 'var(--orange-primary)' }}>{fmt(v.total)}</span></td>
                    <td><span className={`ki-badge ${ESTADO_COLOR[v.estado] || 'muted'}`}>{v.estado}</span></td>
                    <td><span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.numero_factura || '—'}</span></td>
                    <td><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{detalle?.id_venta === v.id_venta ? '▲' : '▼'}</span></td>
                  </tr>
                  {detalle?.id_venta === v.id_venta && (
                    <tr key={`d${v.id_venta}`}>
                      <td colSpan="9" style={{ padding: '0 1rem 1rem', background: 'var(--bg-elevated)' }}>
                        <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>Detalle de venta #{detalle.id_venta}</p>
                            {detalle.estado === 'completada' && <Btn variant="danger" size="xs" onClick={() => cancelar(detalle.id_venta)}>Cancelar venta</Btn>}
                          </div>
                          <table className="ki-table" style={{ marginBottom: '0.75rem' }}>
                            <thead><tr><th>Producto</th><th>Código</th><th>Precio unit.</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                            <tbody>
                              {detalle.detalle?.map(d => (
                                <tr key={d.id_detalle}>
                                  <td style={{ color: 'var(--text-primary)' }}>{d.producto}</td>
                                  <td><span className="mono">{d.codigo || '—'}</span></td>
                                  <td><span className="mono">{fmt(d.precio_unitario)}</span></td>
                                  <td>{d.cantidad}</td>
                                  <td><span className="mono" style={{ color: 'var(--orange-primary)', fontWeight: 600 }}>{fmt(d.subtotal)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'flex-end', fontSize: '13px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Subtotal: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(detalle.subtotal)}</strong></span>
                            <span style={{ color: 'var(--text-muted)' }}>IVA: <strong style={{ fontFamily: 'var(--font-mono)' }}>{fmt(detalle.impuesto)}</strong></span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>TOTAL: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--orange-primary)' }}>{fmt(detalle.total)}</strong></span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</Btn>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '0 0.75rem' }}>Página {page} de {Math.ceil(total / LIMIT)}</span>
            <Btn variant="secondary" size="sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>Siguiente →</Btn>
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getFacturas, getFactura, getResumenFact, cambiarEstadoFact } from '../../services/api';
import { PageHeader, Btn, StatCard, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

const ESTADO_COLOR = { emitida:'info', pagada:'success', anulada:'error', vencida:'warning' };

export default function Facturas() {
  const [facturas, setFacturas]   = useState([]);
  const [resumen, setResumen]     = useState(null);
  const [detalle, setDetalle]     = useState(null);
  const [filtro, setFiltro]       = useState('');
  const [cargando, setCargando]   = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const LIMIT = 20;

  const cargar = async () => {
    setCargando(true);
    try {
      const [f, r] = await Promise.all([getFacturas({ estado: filtro, page, limit: LIMIT }), getResumenFact()]);
      setFacturas(f.data.data.facturas);
      setTotal(f.data.data.total);
      setResumen(r.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [filtro, page]);

  const verDetalle = async (id) => {
    if (detalle?.id_factura === id) { setDetalle(null); return; }
    const { data } = await getFactura(id);
    setDetalle(data.data);
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await cambiarEstadoFact(id, { estado });
      toast.success(`Factura marcada como ${estado}.`);
      cargar();
      if (detalle?.id_factura === id) { const { data } = await getFactura(id); setDetalle(data.data); }
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error.'); }
  };

  const imprimir = (f) => {
    const w = window.open('', '_blank');
    const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);
    w.document.write(`<!DOCTYPE html><html><head><title>${f.numero_factura}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;padding:2rem;color:#111;max-width:700px;margin:0 auto}.logo{font-size:2rem;font-weight:900;color:#FF6B35;margin-bottom:0.25rem}.header{border-bottom:3px solid #FF6B35;padding-bottom:1rem;margin-bottom:1.5rem}table{width:100%;border-collapse:collapse;margin:1rem 0}th{background:#111;color:#fff;padding:0.5rem;text-align:left;font-size:12px}td{padding:0.5rem;border-bottom:1px solid #eee;font-size:13px}.total{font-size:1.1rem;font-weight:700;text-align:right;padding-top:0.5rem}.orange{color:#FF6B35}</style>
    </head><body>
    <div class="header"><div class="logo">K<span style="font-weight:400;color:#111">inventory</span></div>
    <p style="font-size:12px;color:#666;margin-top:0.25rem">${f.empresa || ''} ${f.nit ? `• NIT: ${f.nit}` : ''}</p>
    <p style="font-size:12px;color:#666">${f.dir_empresa || ''} ${f.ciudad ? `• ${f.ciudad}` : ''}</p></div>
    <div style="display:flex;justify-content:space-between;margin-bottom:1.5rem">
    <div><h2 class="orange">Factura ${f.numero_factura}</h2><p style="font-size:12px;color:#666">Fecha: ${new Date(f.fecha_emision).toLocaleString('es-CO')}</p><p style="font-size:12px;color:#666">Estado: ${f.estado?.toUpperCase()}</p><p style="font-size:12px;color:#666">Pago: ${f.metodo_pago}</p></div>
    <div style="text-align:right"><p style="font-weight:600">${f.cliente?.trim() || 'Cliente General'}</p>${f.documento ? `<p style="font-size:12px;color:#666">Doc: ${f.documento}</p>` : ''}${f.email_cliente ? `<p style="font-size:12px;color:#666">${f.email_cliente}</p>` : ''}</div></div>
    <table><thead><tr><th>Producto</th><th>Cant.</th><th>Precio unit.</th><th>Subtotal</th></tr></thead><tbody>
    ${(f.detalle||[]).map(d => `<tr><td>${d.producto}</td><td>${d.cantidad}</td><td>${fmt(d.precio_unitario)}</td><td><strong>${fmt(d.subtotal)}</strong></td></tr>`).join('')}
    </tbody></table>
    <div style="text-align:right;margin-top:1rem"><p>Subtotal: ${fmt(f.subtotal)}</p>${f.descuento > 0 ? `<p>Descuento: -${fmt(f.descuento)}</p>` : ''}<p>IVA: ${fmt(f.impuesto)}</p><p class="total">TOTAL: <span class="orange">${fmt(f.total)}</span></p></div>
    ${f.pie_factura ? `<p style="margin-top:2rem;font-size:11px;color:#888;border-top:1px solid #eee;padding-top:1rem">${f.pie_factura}</p>` : ''}
    <script>window.print();window.close();</script></body></html>`);
    w.document.close();
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div>
      <PageHeader title="Facturación" subtitle="Gestión de facturas y cobros" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Total facturas" value={resumen?.total || '—'} icon="📄" color="var(--orange-primary)" loading={!resumen} />
        <StatCard title="Emitidas" value={resumen?.emitidas || 0} icon="📤" color="var(--info)" loading={!resumen} />
        <StatCard title="Pagadas" value={resumen?.pagadas || 0} icon="✅" color="var(--success)" loading={!resumen} />
        <StatCard title="Cobrado" value={fmt(resumen?.cobrado)} icon="💰" color="var(--success)" loading={!resumen} />
        <StatCard title="Pendiente" value={fmt(resumen?.pendiente)} icon="⏳" color="var(--warning)" loading={!resumen} />
      </div>

      {/* Filtro */}
      <div style={{ marginBottom: '1rem' }}>
        <select style={{ width: 'auto' }} value={filtro} onChange={e => { setFiltro(e.target.value); setPage(1); }}>
          <option value="">Todas</option>
          <option value="emitida">Emitidas</option>
          <option value="pagada">Pagadas</option>
          <option value="anulada">Anuladas</option>
        </select>
      </div>

      <div className="ki-card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ki-table">
            <thead><tr><th>N° Factura</th><th>Fecha</th><th>Cliente</th><th>Vendedor</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {cargando ? [1,2,3].map(i => <tr key={i}>{[1,2,3,4,5,6,7].map(j => <td key={j}><Skeleton h={16}/></td>)}</tr>) :
              facturas.length === 0 ? <tr><td colSpan="7"><EmptyState icon="📄" title="Sin facturas" /></td></tr> :
              facturas.map(f => (
                <>
                  <tr key={f.id_factura} style={{ cursor: 'pointer' }} onClick={() => verDetalle(f.id_factura)}>
                    <td><span className="mono" style={{ color: 'var(--orange-primary)', fontWeight: 600 }}>{f.numero_factura}</span></td>
                    <td style={{ fontSize: '12px' }}>{new Date(f.fecha_emision).toLocaleDateString('es-CO')}</td>
                    <td>{f.cliente?.trim() || <span style={{ color: 'var(--text-muted)' }}>General</span>}</td>
                    <td style={{ fontSize: '12px' }}>{f.vendedor}</td>
                    <td><span className="mono" style={{ fontWeight: 700, color: 'var(--orange-primary)' }}>{fmt(f.total)}</span></td>
                    <td><span className={`ki-badge ${ESTADO_COLOR[f.estado] || 'muted'}`}>{f.estado}</span></td>
                    <td onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <Btn variant="ghost" size="xs" onClick={() => { getFactura(f.id_factura).then(r => imprimir(r.data.data)); }}>🖨️</Btn>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{detalle?.id_factura === f.id_factura ? '▲' : '▼'}</span>
                      </div>
                    </td>
                  </tr>
                  {detalle?.id_factura === f.id_factura && (
                    <tr key={`d${f.id_factura}`}>
                      <td colSpan="7" style={{ padding: '0 1rem 1rem', background: 'var(--bg-elevated)' }}>
                        <div style={{ padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', marginTop: '0.5rem' }}>
                          <table className="ki-table" style={{ marginBottom: '0.75rem' }}>
                            <thead><tr><th>Producto</th><th>Precio unit.</th><th>Cant.</th><th>Subtotal</th></tr></thead>
                            <tbody>
                              {detalle.detalle?.map(d => (
                                <tr key={d.id_detalle}>
                                  <td style={{ color: 'var(--text-primary)' }}>{d.producto}</td>
                                  <td><span className="mono">{fmt(d.precio_unitario)}</span></td>
                                  <td>{d.cantidad}</td>
                                  <td><span className="mono" style={{ color: 'var(--orange-primary)', fontWeight: 600 }}>{fmt(d.subtotal)}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {['pagada', 'anulada'].map(e => (
                                <Btn key={e} size="xs" variant={e === 'pagada' ? 'success' : 'danger'} onClick={() => cambiarEstado(detalle.id_factura, e)} disabled={detalle.estado === e}>
                                  {e === 'pagada' ? '✅ Marcar pagada' : '❌ Anular'}
                                </Btn>
                              ))}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '13px' }}>
                              <p style={{ color: 'var(--text-muted)' }}>IVA: {fmt(detalle.impuesto)}</p>
                              <p style={{ fontWeight: 700, color: 'var(--orange-primary)', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>TOTAL: {fmt(detalle.total)}</p>
                            </div>
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

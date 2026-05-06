import { useEffect, useState } from 'react';
import { getMovimientos, getResumenInventario, getStockBajo, alertarStock } from '../../services/api';
import { PageHeader, Btn, StatCard, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

const TIPO_COLORS = {
  entrada_compra:     { label:'Compra',        color:'var(--success)',  dir:'+' },
  entrada_devolucion: { label:'Devolución',     color:'var(--success)',  dir:'+' },
  entrada_ajuste:     { label:'Ajuste +',       color:'var(--info)',     dir:'+' },
  traslado_entrada:   { label:'Traslado in',    color:'var(--info)',     dir:'+' },
  salida_venta:       { label:'Venta',          color:'var(--text-muted)',dir:'-'},
  salida_reposicion:  { label:'Reposición',     color:'var(--warning)',  dir:'-' },
  salida_baja:        { label:'Baja',           color:'var(--error)',    dir:'-' },
  salida_ajuste:      { label:'Ajuste -',       color:'var(--warning)',  dir:'-' },
  traslado_salida:    { label:'Traslado out',   color:'var(--warning)',  dir:'-' },
};

export default function Inventario() {
  const [tab, setTab]               = useState('movimientos');
  const [movimientos, setMovimientos] = useState([]);
  const [stockBajo, setStockBajo]   = useState([]);
  const [resumen, setResumen]       = useState(null);
  const [cargando, setCargando]     = useState(true);
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);
  const [filtroProd, setFiltroProd] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  const cargar = async () => {
    setCargando(true);
    try {
      const [m, sb, r] = await Promise.all([
        getMovimientos({ limit: 100 }),
        getStockBajo(),
        getResumenInventario(),
      ]);
      setMovimientos(m.data.data.movimientos);
      setStockBajo(sb.data.data);
      setResumen(r.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const enviarAlerta = async () => {
    setEnviandoAlerta(true);
    try {
      const { data } = await alertarStock();
      toast.success(data.mensaje);
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al enviar alerta.'); }
    finally { setEnviandoAlerta(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  const movFiltrados = movimientos.filter(m => {
    const matchProd = !filtroProd || m.producto?.toLowerCase().includes(filtroProd.toLowerCase());
    const matchTipo = !filtroTipo || m.tipo === filtroTipo;
    return matchProd && matchTipo;
  });

  return (
    <div>
      <PageHeader title="Inventario" subtitle="Trazabilidad completa de movimientos"
        actions={
          <Btn variant="secondary" size="sm" loading={enviandoAlerta} onClick={enviarAlerta} icon="📧">
            Alertar stock crítico
          </Btn>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px,1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard title="Total productos" value={resumen?.total_productos || '—'} icon="📦" color="var(--orange-primary)" loading={!resumen} />
        <StatCard title="En stock" value={resumen?.en_stock || 0} icon="✅" color="var(--success)" loading={!resumen} />
        <StatCard title="Stock bajo" value={resumen?.stock_bajo || 0} icon="⚠️" color="var(--warning)" loading={!resumen} />
        <StatCard title="Críticos" value={resumen?.stock_critico || 0} icon="🔴" color="var(--error)" loading={!resumen} />
        <StatCard title="Agotados" value={resumen?.agotados || 0} icon="❌" color="var(--error)" loading={!resumen} />
        <StatCard title="Valor inventario" value={fmt(resumen?.valor_inventario)} icon="💰" color="var(--info)" loading={!resumen} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
        {[['movimientos','📋 Movimientos'], ['criticos','⚠️ Stock crítico']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'var(--transition)', background: tab === id ? 'var(--bg-surface)' : 'transparent', color: tab === id ? 'var(--orange-primary)' : 'var(--text-muted)' }}>
            {label} {id === 'criticos' && stockBajo.length > 0 && <span style={{ background: 'var(--error)', color: '#fff', borderRadius: '99px', padding: '0 5px', fontSize: '10px', marginLeft: '4px' }}>{stockBajo.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'movimientos' && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input style={{ maxWidth: 250 }} placeholder="🔍 Buscar producto..." value={filtroProd} onChange={e => setFiltroProd(e.target.value)} />
            <select style={{ width: 'auto' }} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_COLORS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="ki-card" style={{ padding: 0 }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="ki-table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cantidad</th><th>Stock ant.</th><th>Stock nuevo</th><th>Usuario</th><th>Referencia</th><th>Notas</th></tr></thead>
                <tbody>
                  {cargando ? [1,2,3,4].map(i => <tr key={i}>{[1,2,3,4,5,6,7,8,9].map(j => <td key={j}><Skeleton h={14}/></td>)}</tr>) :
                  movFiltrados.length === 0 ? <tr><td colSpan="9"><EmptyState icon="📋" title="Sin movimientos" /></td></tr> :
                  movFiltrados.map(m => {
                    const tipo = TIPO_COLORS[m.tipo] || { label: m.tipo, color: 'var(--text-muted)', dir: '?' };
                    return (
                      <tr key={m.id_movimiento}>
                        <td style={{ fontSize: '11px' }}>{new Date(m.creado_en).toLocaleString('es-CO')}</td>
                        <td><span style={{ color: tipo.color, fontWeight: 600, fontSize: '12px' }}>{tipo.dir} {tipo.label}</span></td>
                        <td style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px' }}>{m.producto}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: tipo.dir === '+' ? 'var(--success)' : 'var(--error)' }}>{tipo.dir}{m.cantidad}</td>
                        <td><span className="mono">{m.stock_anterior}</span></td>
                        <td><span className="mono" style={{ fontWeight: 600, color: m.stock_nuevo <= 5 ? 'var(--error)' : 'var(--text-primary)' }}>{m.stock_nuevo}</span></td>
                        <td style={{ fontSize: '12px' }}>{m.usuario}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.referencia || '—'}</td>
                        <td style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.notas || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'criticos' && (
        <div className="ki-card" style={{ padding: 0 }}>
          {stockBajo.length === 0 ? <EmptyState icon="✅" title="Sin productos críticos" description="Todo el inventario está en niveles normales." /> : (
            <div style={{ overflowX: 'auto' }}>
              <table className="ki-table">
                <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Proveedor</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th></tr></thead>
                <tbody>
                  {stockBajo.map(p => (
                    <tr key={p.id_producto}>
                      <td><span className="mono">{p.codigo || '—'}</span></td>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nombre}</td>
                      <td>{p.categoria}</td>
                      <td style={{ fontSize: '12px' }}>{p.proveedor || '—'}</td>
                      <td><span className="mono" style={{ fontWeight: 700, color: p.stock_actual === 0 ? 'var(--error)' : 'var(--warning)' }}>{p.stock_actual}</span></td>
                      <td><span className="mono">{p.stock_minimo}</span></td>
                      <td><span className={`ki-badge ${p.estado_stock === 'agotado' ? 'error' : 'warning'}`}>{p.estado_stock}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { getAuditoria, getVentasPorVendedor, exportarInventario } from '../../services/api';
import { PageHeader, Btn, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

export default function Reportes() {
  const [tab, setTab]             = useState('vendedores');
  const [vendedores, setVendedores] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [exportando, setExportando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [v, a] = await Promise.all([getVentasPorVendedor(), getAuditoria({ limit: 100 })]);
        setVendedores(v.data.data);
        setAuditoria(a.data.data.registros);
      } finally { setCargando(false); }
    };
    cargar();
  }, []);

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  const exportarExcel = async () => {
    setExportando(true);
    try {
      const { data } = await exportarInventario();
      const rows = data.data;
      if (!rows.length) { toast.error('Sin datos para exportar.'); return; }
      const headers = Object.keys(rows[0]);
      const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `kinventory_inventario_${new Date().toISOString().slice(0,10)}.csv`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('Exportación completada.');
    } catch (err) { toast.error('Error al exportar.'); }
    finally { setExportando(false); }
  };

  return (
    <div>
      <PageHeader title="Reportes" subtitle="Análisis y auditoría del sistema"
        actions={<Btn variant="secondary" size="sm" loading={exportando} onClick={exportarExcel} icon="📥">Exportar inventario CSV</Btn>}
      />

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', background: 'var(--bg-elevated)', padding: '0.25rem', borderRadius: 'var(--radius-lg)', width: 'fit-content' }}>
        {[['vendedores','🏆 Por vendedor'], ['auditoria','🔍 Auditoría']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '0.4rem 1rem', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'var(--transition)', background: tab === id ? 'var(--bg-surface)' : 'transparent', color: tab === id ? 'var(--orange-primary)' : 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'vendedores' && (
        <div className="ki-card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="ki-table">
              <thead><tr><th>Vendedor</th><th>N° Ventas</th><th>Total vendido</th><th>Ticket promedio</th><th>Participación</th></tr></thead>
              <tbody>
                {cargando ? [1,2,3].map(i => <tr key={i}>{[1,2,3,4,5].map(j => <td key={j}><Skeleton h={16}/></td>)}</tr>) :
                vendedores.length === 0 ? <tr><td colSpan="5"><EmptyState icon="📊" title="Sin datos del mes" /></td></tr> : (() => {
                  const totalGeneral = vendedores.reduce((a, v) => a + parseFloat(v.total_vendido || 0), 0);
                  return vendedores.map((v, i) => {
                    const pct = totalGeneral > 0 ? (parseFloat(v.total_vendido) / totalGeneral * 100).toFixed(1) : 0;
                    return (
                      <tr key={v.id_usuario}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--orange-primary)' : 'var(--bg-elevated)', color: i === 0 ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                              {i === 0 ? '🏆' : i + 1}
                            </div>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v.vendedor}</span>
                          </div>
                        </td>
                        <td><span className="mono" style={{ fontWeight: 600 }}>{v.num_ventas}</span></td>
                        <td><span className="mono" style={{ color: 'var(--orange-primary)', fontWeight: 700 }}>{fmt(v.total_vendido)}</span></td>
                        <td><span className="mono">{fmt(v.ticket_promedio)}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: 'var(--orange-primary)', borderRadius: '99px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: 35 }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'auditoria' && (
        <div className="ki-card" style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="ki-table">
              <thead><tr><th>Fecha</th><th>Usuario</th><th>Rol</th><th>Acción</th><th>Tabla</th><th>IP</th></tr></thead>
              <tbody>
                {cargando ? [1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><Skeleton h={14}/></td>)}</tr>) :
                auditoria.length === 0 ? <tr><td colSpan="6"><EmptyState icon="🔍" title="Sin registros de auditoría" /></td></tr> :
                auditoria.map(a => (
                  <tr key={a.id_auditoria}>
                    <td style={{ fontSize: '11px' }}>{new Date(a.creado_en).toLocaleString('es-CO')}</td>
                    <td style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{a.usuario}</td>
                    <td><span className={`ki-badge ${a.rol === 'Administrador' ? 'orange' : a.rol === 'Vendedor' ? 'info' : 'success'}`}>{a.rol}</span></td>
                    <td><span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', padding: '0.15rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>{a.accion}</span></td>
                    <td style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{a.tabla || '—'}</td>
                    <td><span className="mono" style={{ fontSize: '11px' }}>{a.ip_address || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

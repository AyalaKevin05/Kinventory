import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardResumen, getTopProductos, getVentasMes, getStockBajo } from '../../services/api';
import { StatCard, PageHeader, SkeletonCard, EmptyState } from '../../components/common';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', fontSize: '12px' }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color, fontWeight: 600 }}>{p.name}: {typeof p.value === 'number' && p.value > 999 ? `$${p.value.toLocaleString()}` : p.value}</p>)}
    </div>
  );
};

export default function AdminDashboard() {
  const { usuario } = useAuth();
  const [resumen, setResumen]       = useState(null);
  const [topProds, setTopProds]     = useState([]);
  const [ventasMes, setVentasMes]   = useState([]);
  const [stockBajo, setStockBajo]   = useState([]);
  const [cargando, setCargando]     = useState(true);

  useEffect(() => {
    Promise.all([getDashboardResumen(), getTopProductos(), getVentasMes(), getStockBajo()])
      .then(([r, tp, vm, sb]) => {
        setResumen(r.data.data);
        setTopProds(tp.data.data);
        setVentasMes(vm.data.data.map(v => ({ mes: v.mes?.substring(0,7), ventas: v.num_ventas, ingresos: parseFloat(v.total_mes||0) })));
        setStockBajo(sb.data.data);
      })
      .finally(() => setCargando(false));
  }, []);

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  return (
    <div>
      <PageHeader
        title={`Buenas, ${usuario?.nombre} 👋`}
        subtitle={`${new Date().toLocaleDateString('es-CO', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}`}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {cargando ? [1,2,3,4].map(i => <SkeletonCard key={i} />) : (
          <>
            <StatCard title="Ventas hoy" value={resumen?.ventas_hoy || 0} subtitle="Transacciones del día" icon="🧾" color="var(--orange-primary)" loading={cargando} />
            <StatCard title="Ingresos hoy" value={fmt(resumen?.ingresos_hoy)} icon="💰" color="var(--success)" loading={cargando} />
            <StatCard title="Ingresos del mes" value={fmt(resumen?.ingresos_mes)} icon="📈" color="var(--info)" loading={cargando} />
            <StatCard title="Stock crítico" value={resumen?.stock_critico || 0} subtitle="Productos con bajo stock" icon="⚠️" color="var(--error)" loading={cargando} />
          </>
        )}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Ventas por mes */}
        <div className="ki-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>📈 Ingresos por mes</h3>
          {cargando ? <SkeletonCard /> : ventasMes.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={ventasMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="mes" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="ingresos" stroke="var(--orange-primary)" strokeWidth={2} dot={{ fill: 'var(--orange-primary)', r: 4 }} name="Ingresos" />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="📊" title="Sin datos de ventas aún" />}
        </div>

        {/* Top productos */}
        <div className="ki-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>🏆 Productos más vendidos</h3>
          {cargando ? <SkeletonCard /> : topProds.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topProds.slice(0,6)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis dataKey="producto" type="category" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="unidades_vendidas" fill="var(--orange-primary)" radius={[0,4,4,0]} name="Vendidos" />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon="📦" title="Sin ventas registradas" />}
        </div>
      </div>

      {/* Stock crítico */}
      {stockBajo.length > 0 && (
        <div className="ki-card">
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '1rem' }}>
            ⚠️ Productos con stock crítico
            <span className="ki-badge error" style={{ marginLeft: '0.5rem' }}>{stockBajo.length}</span>
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="ki-table">
              <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>Stock actual</th><th>Stock mínimo</th><th>Estado</th></tr></thead>
              <tbody>
                {stockBajo.slice(0,8).map(p => (
                  <tr key={p.id_producto}>
                    <td><span className="mono">{p.codigo || '—'}</span></td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nombre}</td>
                    <td>{p.categoria}</td>
                    <td><span style={{ color: p.stock_actual === 0 ? 'var(--error)' : 'var(--warning)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{p.stock_actual}</span></td>
                    <td><span className="mono">{p.stock_minimo}</span></td>
                    <td><span className={`ki-badge ${p.estado_stock === 'agotado' ? 'error' : 'warning'}`}>{p.estado_stock}</span></td>
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

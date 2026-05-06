import { useEffect, useState } from 'react';
import { getProductos, crearProducto, actualizarProducto, eliminarProducto, getCategorias, getProveedores } from '../../services/api';
import { PageHeader, Btn, Input, Select, Modal, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

const VACIO = { nombre:'', descripcion:'', codigo:'', codigo_barras:'', precio_compra:0, precio_venta:0, stock_actual:0, stock_minimo:5, stock_maximo:1000, id_categoria:'', id_proveedor:'', unidad_medida:'unidad', aplica_iva:1 };

export default function Productos() {
  const [productos, setProductos]   = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [total, setTotal]           = useState(0);
  const [modal, setModal]           = useState(false);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(VACIO);
  const [busqueda, setBusqueda]     = useState('');
  const [filtroStock, setFiltroStock] = useState('');
  const [cargando, setCargando]     = useState(true);
  const [guardando, setGuardando]   = useState(false);
  const [page, setPage]             = useState(1);
  const LIMIT = 20;

  const cargar = async () => {
    setCargando(true);
    try {
      const [p, c, pr] = await Promise.all([
        getProductos({ busqueda, estado_stock: filtroStock, page, limit: LIMIT }),
        getCategorias(), getProveedores()
      ]);
      setProductos(p.data.data.productos);
      setTotal(p.data.data.total);
      setCategorias(c.data.data);
      setProveedores(pr.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, [busqueda, filtroStock, page]);

  const abrirModal = (p = null) => {
    setEditando(p);
    setForm(p ? { nombre:p.nombre, descripcion:p.descripcion||'', codigo:p.codigo||'', codigo_barras:p.codigo_barras||'', precio_compra:p.precio_compra, precio_venta:p.precio_venta, stock_actual:p.stock_actual, stock_minimo:p.stock_minimo, stock_maximo:p.stock_maximo, id_categoria:p.id_categoria, id_proveedor:p.id_proveedor||'', unidad_medida:p.unidad_medida||'unidad', aplica_iva:p.aplica_iva } : VACIO);
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) { await actualizarProducto(editando.id_producto, form); toast.success('Producto actualizado.'); }
      else          { await crearProducto(form); toast.success('Producto creado.'); }
      setModal(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al guardar.'); }
    finally { setGuardando(false); }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    try { await eliminarProducto(id); toast.success('Producto eliminado.'); cargar(); }
    catch (err) { toast.error(err.response?.data?.mensaje || 'Error al eliminar.'); }
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n || 0);

  const ESTADO_COLORS = { normal: 'success', bajo: 'warning', critico: 'error', agotado: 'error' };

  return (
    <div>
      <PageHeader title="Productos" subtitle={`${total} productos en catálogo`}
        actions={<Btn onClick={() => abrirModal()} icon="+" size="sm">Nuevo producto</Btn>}
      />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <input style={{ maxWidth: 320 }} placeholder="🔍 Buscar por nombre, código..." value={busqueda} onChange={e => { setBusqueda(e.target.value); setPage(1); }} />
        <select style={{ width: 'auto' }} value={filtroStock} onChange={e => { setFiltroStock(e.target.value); setPage(1); }}>
          <option value="">Todos los estados</option>
          <option value="normal">Stock normal</option>
          <option value="bajo">Stock bajo</option>
          <option value="agotado">Agotados</option>
        </select>
      </div>

      <div className="ki-card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ki-table">
            <thead><tr><th>Código</th><th>Producto</th><th>Categoría</th><th>P. Compra</th><th>P. Venta</th><th>Stock</th><th>Estado</th><th>IVA</th><th></th></tr></thead>
            <tbody>
              {cargando ? [1,2,3,4,5].map(i => (
                <tr key={i}>{[1,2,3,4,5,6,7,8,9].map(j => <td key={j}><Skeleton h={16} /></td>)}</tr>
              )) : productos.length === 0 ? (
                <tr><td colSpan="9"><EmptyState icon="📦" title="Sin productos" description="Agrega tu primer producto" /></td></tr>
              ) : productos.map(p => (
                <tr key={p.id_producto}>
                  <td><span className="mono">{p.codigo || '—'}</span></td>
                  <td>
                    <p style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{p.nombre}</p>
                    {p.descripcion && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{p.descripcion.substring(0,50)}{p.descripcion.length > 50 ? '…' : ''}</p>}
                  </td>
                  <td><span style={{ fontSize: '12px', padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>{p.categoria}</span></td>
                  <td><span className="mono" style={{ color: 'var(--text-muted)' }}>{fmt(p.precio_compra)}</span></td>
                  <td><span className="mono" style={{ color: 'var(--orange-primary)', fontWeight: 600 }}>{fmt(p.precio_venta)}</span></td>
                  <td><span className="mono" style={{ fontWeight: 700, color: p.stock_actual === 0 ? 'var(--error)' : p.stock_actual <= p.stock_minimo ? 'var(--warning)' : 'var(--text-primary)' }}>{p.stock_actual}</span></td>
                  <td><span className={`ki-badge ${ESTADO_COLORS[p.estado_stock] || 'muted'}`}>{p.estado_stock}</span></td>
                  <td><span className={`ki-badge ${p.aplica_iva ? 'orange' : 'muted'}`}>{p.aplica_iva ? 'Sí' : 'No'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <Btn variant="ghost" size="xs" onClick={() => abrirModal(p)}>✏️</Btn>
                      <Btn variant="ghost" size="xs" onClick={() => eliminar(p.id_producto)} style={{ color: 'var(--error)' }}>🗑️</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {total > LIMIT && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <Btn variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Anterior</Btn>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '0 0.75rem' }}>Página {page} de {Math.ceil(total / LIMIT)}</span>
            <Btn variant="secondary" size="sm" disabled={page >= Math.ceil(total / LIMIT)} onClick={() => setPage(p => p + 1)}>Siguiente →</Btn>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar producto' : 'Nuevo producto'} width={600}
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn loading={guardando} onClick={guardar}>Guardar</Btn></>}>
        <form onSubmit={guardar}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div style={{ gridColumn: '1/-1' }}><Input label="Nombre *" value={form.nombre} onChange={e => setForm({...form, nombre:e.target.value})} required /></div>
            <Input label="Código interno" value={form.codigo} onChange={e => setForm({...form, codigo:e.target.value})} placeholder="PROD-001" />
            <Input label="Código de barras" value={form.codigo_barras} onChange={e => setForm({...form, codigo_barras:e.target.value})} />
            <Input label="Precio compra" type="number" min={0} prefix="$" value={form.precio_compra} onChange={e => setForm({...form, precio_compra:e.target.value})} />
            <Input label="Precio venta *" type="number" min={0} prefix="$" value={form.precio_venta} onChange={e => setForm({...form, precio_venta:e.target.value})} required />
            <Input label="Stock inicial" type="number" min={0} value={form.stock_actual} onChange={e => setForm({...form, stock_actual:e.target.value})} />
            <Input label="Stock mínimo" type="number" min={0} value={form.stock_minimo} onChange={e => setForm({...form, stock_minimo:e.target.value})} />
            <Select label="Categoría *" value={form.id_categoria} onChange={e => setForm({...form, id_categoria:e.target.value})} required>
              <option value="">Seleccionar...</option>
              {categorias.map(c => <option key={c.id_categoria} value={c.id_categoria}>{c.nombre}</option>)}
            </Select>
            <Select label="Proveedor" value={form.id_proveedor} onChange={e => setForm({...form, id_proveedor:e.target.value})}>
              <option value="">Sin proveedor</option>
              {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre}</option>)}
            </Select>
            <Select label="Aplica IVA" value={form.aplica_iva} onChange={e => setForm({...form, aplica_iva:parseInt(e.target.value)})}>
              <option value={1}>Sí</option>
              <option value={0}>No</option>
            </Select>
            <Input label="Unidad de medida" value={form.unidad_medida} onChange={e => setForm({...form, unidad_medida:e.target.value})} placeholder="unidad, kg, lt..." />
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} rows={2} style={{ resize: 'vertical' }} />
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

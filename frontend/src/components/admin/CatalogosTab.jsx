import React, { useEffect, useState } from 'react';
import { getCategorias, crearCategoria, actualizarCategoria, eliminarCategoria } from '../../services/api';
import { Btn, Input, Modal, EmptyState, Skeleton } from '../common';
import toast from 'react-hot-toast';

export default function CatalogosTab() {
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', color: '#FF6B35', icono: '' });

  const cargar = async () => {
    setCargando(true);
    try {
      const res = await getCategorias();
      setCategorias(res.data.data);
    } catch (err) {
      toast.error('Error al cargar categorías');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (cat = null) => {
    setEditando(cat);
    setForm(cat ? { nombre: cat.nombre, descripcion: cat.descripcion || '', color: cat.color || '#FF6B35', icono: cat.icono || '' } : { nombre: '', descripcion: '', color: '#FF6B35', icono: '' });
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (editando) {
        await actualizarCategoria(editando.id_categoria, form);
        toast.success('Categoría actualizada.');
      } else {
        await crearCategoria(form);
        toast.success('Categoría creada.');
      }
      setModal(false);
      cargar();
    } catch (err) {
      toast.error(err.response?.data?.mensaje || 'Error al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta categoría? No se mostrará en los nuevos productos.')) return;
    try {
      await eliminarCategoria(id);
      toast.success('Categoría eliminada.');
      cargar();
    } catch (err) {
      toast.error('Error al eliminar.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Gestión de Categorías</h3>
        <Btn size="sm" onClick={() => abrirModal()} icon="+">Nueva categoría</Btn>
      </div>

      <div className="ki-card" style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ki-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Descripción</th>
                <th>Color</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cargando ? [1, 2, 3].map(i => (
                <tr key={i}>{[1, 2, 3, 4, 5].map(j => <td key={j}><Skeleton h={16} /></td>)}</tr>
              )) : categorias.length === 0 ? (
                <tr><td colSpan="5"><EmptyState icon="🏷️" title="Sin categorías" description="Crea tu primera categoría para organizar los productos." /></td></tr>
              ) : categorias.map(c => (
                <tr key={c.id_categoria}>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.nombre}</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{c.descripcion || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: c.color }}></div>
                      <span className="mono" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.color}</span>
                    </div>
                  </td>
                  <td><span className={`ki-badge ${c.activo ? 'success' : 'error'}`}>{c.activo ? 'Activa' : 'Inactiva'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <Btn variant="ghost" size="xs" onClick={() => abrirModal(c)}>✏️</Btn>
                      <Btn variant="ghost" size="xs" onClick={() => eliminar(c.id_categoria)} style={{ color: 'var(--error)' }}>🗑️</Btn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editando ? 'Editar categoría' : 'Nueva categoría'} width={450}
        footer={<><Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn loading={guardando} onClick={guardar}>Guardar</Btn></>}>
        <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <Input label="Nombre de la categoría *" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} required />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} style={{ resize: 'vertical' }} />
          </div>
          <Input type="color" label="Color de la etiqueta" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
        </form>
      </Modal>
    </div>
  );
}

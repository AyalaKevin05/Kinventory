// ════════════════════════════════════════════════
// CLIENTES
// ════════════════════════════════════════════════
import { useEffect, useState } from 'react';
import { getClientes, crearCliente, actualizarCliente } from '../../services/api';
import { PageHeader, Btn, Input, Select, Modal, EmptyState, Skeleton } from '../../components/common';
import toast from 'react-hot-toast';

const VACIO_CLI = { tipo_documento:'CC', documento:'', nombre:'', apellido:'', email:'', telefono:'', direccion:'', ciudad:'' };

export function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modal, setModal]       = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm]         = useState(VACIO_CLI);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = async (b = '') => {
    setCargando(true);
    try { const { data } = await getClientes({ busqueda: b }); setClientes(data.data); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const abrirModal = (c = null) => {
    setEditando(c);
    setForm(c ? { tipo_documento:c.tipo_documento||'CC', documento:c.documento||'', nombre:c.nombre, apellido:c.apellido||'', email:c.email||'', telefono:c.telefono||'', direccion:c.direccion||'', ciudad:c.ciudad||'' } : VACIO_CLI);
    setModal(true);
  };

  const guardar = async (e) => {
    e.preventDefault(); setGuardando(true);
    try {
      if (editando) { await actualizarCliente(editando.id_cliente, form); toast.success('Cliente actualizado.'); }
      else          { await crearCliente(form); toast.success('Cliente creado.'); }
      setModal(false); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error.'); }
    finally { setGuardando(false); }
  };

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n||0);

  return (
    <div>
      <PageHeader title="Clientes" subtitle={`${clientes.length} clientes registrados`}
        actions={<Btn size="sm" onClick={() => abrirModal()} icon="+">Nuevo cliente</Btn>} />
      <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem' }}>
        <input style={{ maxWidth:320 }} placeholder="🔍 Buscar por nombre, documento..." value={busqueda}
          onChange={e => { setBusqueda(e.target.value); cargar(e.target.value); }} />
      </div>
      <div className="ki-card" style={{ padding:0 }}>
        <div style={{ overflowX:'auto' }}>
          <table className="ki-table">
            <thead><tr><th>Documento</th><th>Nombre</th><th>Contacto</th><th>Ciudad</th><th>Total compras</th><th></th></tr></thead>
            <tbody>
              {cargando ? [1,2,3].map(i=><tr key={i}>{[1,2,3,4,5,6].map(j=><td key={j}><Skeleton h={16}/></td>)}</tr>) :
              clientes.length===0 ? <tr><td colSpan="6"><EmptyState icon="👥" title="Sin clientes"/></td></tr> :
              clientes.map(c=>(
                <tr key={c.id_cliente}>
                  <td><span className="mono">{c.tipo_documento}: {c.documento||'—'}</span></td>
                  <td style={{ color:'var(--text-primary)', fontWeight:500 }}>{c.nombre} {c.apellido||''}</td>
                  <td style={{ fontSize:'12px' }}><p>{c.email||'—'}</p><p style={{ color:'var(--text-muted)' }}>{c.telefono||''}</p></td>
                  <td style={{ fontSize:'12px' }}>{c.ciudad||'—'}</td>
                  <td><span className="mono" style={{ color:'var(--orange-primary)', fontWeight:600 }}>{fmt(c.total_compras)}</span></td>
                  <td><Btn variant="ghost" size="xs" onClick={()=>abrirModal(c)}>✏️</Btn></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={modal} onClose={()=>setModal(false)} title={editando?'Editar cliente':'Nuevo cliente'}
        footer={<><Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn loading={guardando} onClick={guardar}>Guardar</Btn></>}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
          <Select label="Tipo documento" value={form.tipo_documento} onChange={e=>setForm({...form,tipo_documento:e.target.value})}>
            {['CC','NIT','CE','PP','TI'].map(t=><option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="Número documento" value={form.documento} onChange={e=>setForm({...form,documento:e.target.value})} />
          <Input label="Nombre *" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required />
          <Input label="Apellido" value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})} />
          <Input label="Email" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} />
          <Input label="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} />
          <Input label="Ciudad" value={form.ciudad} onChange={e=>setForm({...form,ciudad:e.target.value})} />
          <div style={{ gridColumn:'1/-1' }}>
            <label style={{ fontSize:'12px', fontWeight:500, color:'var(--text-secondary)', display:'block', marginBottom:'0.4rem' }}>Dirección</label>
            <textarea value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} rows={2} style={{ resize:'vertical' }} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Clientes;

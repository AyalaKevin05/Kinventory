import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUsuarios, getRoles, getSucursales, registrarUsuario, cambiarContrasena } from '../../services/api';
import { PageHeader, Btn, Input, Select, Modal, EmptyState, Skeleton } from '../../components/common';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const VACIO_USER = { nombre:'', apellido:'', correo:'', contrasena:'', id_rol:'', id_sucursal:'', telefono:'' };

export default function Configuracion() {
  const { usuario } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [tab, setTab]             = useState('usuarios');
  const [usuarios, setUsuarios]   = useState([]);
  const [roles, setRoles]         = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [modal, setModal]         = useState(false);
  const [form, setForm]           = useState(VACIO_USER);
  const [passForm, setPassForm]   = useState({ contrasena_actual:'', contrasena_nueva:'', confirmar:'' });
  const [cargando, setCargando]   = useState(true);
  const [guardando, setGuardando] = useState(false);

  const cargar = async () => {
    setCargando(true);
    try {
      const [u, r, s] = await Promise.all([getUsuarios(), getRoles(), getSucursales()]);
      setUsuarios(u.data.data);
      setRoles(r.data.data);
      setSucursales(s.data.data);
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const guardarUsuario = async (e) => {
    e.preventDefault(); setGuardando(true);
    try {
      await registrarUsuario(form);
      toast.success('Usuario creado. Recuérdales cambiar su contraseña.');
      setModal(false); setForm(VACIO_USER); cargar();
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al crear.'); }
    finally { setGuardando(false); }
  };

  const cambiarPass = async (e) => {
    e.preventDefault();
    if (passForm.contrasena_nueva !== passForm.confirmar) { toast.error('Las contraseñas no coinciden.'); return; }
    setGuardando(true);
    try {
      await cambiarContrasena({ contrasena_actual: passForm.contrasena_actual, contrasena_nueva: passForm.contrasena_nueva });
      toast.success('Contraseña actualizada correctamente.');
      setPassForm({ contrasena_actual:'', contrasena_nueva:'', confirmar:'' });
    } catch (err) { toast.error(err.response?.data?.mensaje || 'Error al cambiar contraseña.'); }
    finally { setGuardando(false); }
  };

  return (
    <div>
      <PageHeader title="Configuración" subtitle="Gestión de usuarios, roles y preferencias" />

      <div style={{ display:'flex', gap:'0.25rem', marginBottom:'1.5rem', background:'var(--bg-elevated)', padding:'0.25rem', borderRadius:'var(--radius-lg)', width:'fit-content' }}>
        {[['usuarios','👥 Usuarios'], ['cuenta','👤 Mi cuenta'], ['apariencia','🎨 Apariencia']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding:'0.4rem 1rem', borderRadius:'var(--radius-md)', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, transition:'var(--transition)', background: tab===id ? 'var(--bg-surface)' : 'transparent', color: tab===id ? 'var(--orange-primary)' : 'var(--text-muted)' }}>
            {label}
          </button>
        ))}
      </div>

      {/* USUARIOS */}
      {tab === 'usuarios' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'1rem' }}>
            <Btn size="sm" onClick={() => setModal(true)} icon="+">Nuevo usuario</Btn>
          </div>
          <div className="ki-card" style={{ padding:0 }}>
            <div style={{ overflowX:'auto' }}>
              <table className="ki-table">
                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Sucursal</th><th>Último acceso</th><th>Estado</th></tr></thead>
                <tbody>
                  {cargando ? [1,2,3].map(i=><tr key={i}>{[1,2,3,4,5,6].map(j=><td key={j}><Skeleton h={16}/></td>)}</tr>) :
                  usuarios.length===0 ? <tr><td colSpan="6"><EmptyState icon="👥" title="Sin usuarios"/></td></tr> :
                  usuarios.map(u=>(
                    <tr key={u.id_usuario}>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:'0.625rem' }}>
                          <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--orange-dim)', color:'var(--orange-primary)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'12px', flexShrink:0 }}>
                            {u.nombre?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight:500, color:'var(--text-primary)', fontSize:'13px' }}>{u.nombre} {u.apellido||''}</p>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize:'12px' }}>{u.correo}</td>
                      <td><span className={`ki-badge ${u.rol==='Administrador'?'orange':u.rol==='Vendedor'?'info':'success'}`}>{u.rol}</span></td>
                      <td style={{ fontSize:'12px' }}>{u.sucursal||'—'}</td>
                      <td style={{ fontSize:'11px', color:'var(--text-muted)' }}>{u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleString('es-CO') : 'Nunca'}</td>
                      <td><span className={`ki-badge ${u.activo ? 'success' : 'error'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Modal open={modal} onClose={()=>setModal(false)} title="Nuevo usuario"
            footer={<><Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn loading={guardando} onClick={guardarUsuario}>Crear usuario</Btn></>}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.875rem' }}>
              <Input label="Nombre *" value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required />
              <Input label="Apellido" value={form.apellido} onChange={e=>setForm({...form,apellido:e.target.value})} />
              <div style={{ gridColumn:'1/-1' }}><Input label="Correo *" type="email" value={form.correo} onChange={e=>setForm({...form,correo:e.target.value})} required /></div>
              <div style={{ gridColumn:'1/-1' }}><Input label="Contraseña temporal *" type="password" value={form.contrasena} onChange={e=>setForm({...form,contrasena:e.target.value})} required placeholder="Mín. 8 caracteres" /></div>
              <Select label="Rol *" value={form.id_rol} onChange={e=>setForm({...form,id_rol:e.target.value})} required>
                <option value="">Seleccionar rol...</option>
                {roles.map(r=><option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>)}
              </Select>
              <Select label="Sucursal" value={form.id_sucursal} onChange={e=>setForm({...form,id_sucursal:e.target.value})}>
                <option value="">Sin sucursal</option>
                {sucursales.map(s=><option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre}</option>)}
              </Select>
              <div style={{ gridColumn:'1/-1' }}><Input label="Teléfono" value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} /></div>
            </div>
          </Modal>
        </div>
      )}

      {/* MI CUENTA */}
      {tab === 'cuenta' && (
        <div style={{ maxWidth:480 }}>
          <div className="ki-card" style={{ marginBottom:'1rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'1rem', marginBottom:'1rem' }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--orange-primary)', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:700, fontSize:'1.4rem', fontFamily:'var(--font-display)' }}>
                {usuario?.nombre?.[0]?.toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:700, color:'var(--text-primary)', fontSize:'1rem' }}>{usuario?.nombre} {usuario?.apellido||''}</p>
                <p style={{ fontSize:'12px', color:'var(--text-muted)' }}>{usuario?.correo}</p>
                <span className={`ki-badge ${usuario?.rol==='Administrador'?'orange':usuario?.rol==='Vendedor'?'info':'success'}`} style={{ marginTop:'0.25rem' }}>{usuario?.rol}</span>
              </div>
            </div>
            <div className="ki-divider" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.5rem', marginTop:'0.75rem' }}>
              {[['Empresa', usuario?.empresa], ['Sucursal', usuario?.sucursal||'—']].map(([l,v])=>(
                <div key={l}>
                  <p style={{ fontSize:'11px', color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em' }}>{l}</p>
                  <p style={{ fontSize:'13px', color:'var(--text-primary)', marginTop:'0.2rem' }}>{v}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="ki-card">
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:'1rem' }}>🔐 Cambiar contraseña</h3>
            <form onSubmit={cambiarPass} style={{ display:'flex', flexDirection:'column', gap:'0.875rem' }}>
              <Input label="Contraseña actual" type="password" value={passForm.contrasena_actual} onChange={e=>setPassForm({...passForm,contrasena_actual:e.target.value})} required />
              <Input label="Nueva contraseña" type="password" value={passForm.contrasena_nueva} onChange={e=>setPassForm({...passForm,contrasena_nueva:e.target.value})} required />
              <Input label="Confirmar nueva contraseña" type="password" value={passForm.confirmar} onChange={e=>setPassForm({...passForm,confirmar:e.target.value})} required error={passForm.confirmar && passForm.contrasena_nueva !== passForm.confirmar ? 'Las contraseñas no coinciden' : ''} />
              <Btn type="submit" loading={guardando}>Actualizar contraseña</Btn>
            </form>
          </div>
        </div>
      )}

      {/* APARIENCIA */}
      {tab === 'apariencia' && (
        <div style={{ maxWidth:480 }}>
          <div className="ki-card">
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:'0.9rem', color:'var(--text-primary)', marginBottom:'1.25rem' }}>🎨 Tema de la interfaz</h3>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
              {[['dark','🌙 Oscuro','Fondo grafito profundo'], ['light','☀️ Claro','Fondo blanco limpio']].map(([id, label, desc])=>(
                <button key={id} onClick={() => id !== theme && toggleTheme()}
                  style={{ padding:'1rem', borderRadius:'var(--radius-lg)', border:`2px solid ${theme===id ? 'var(--orange-primary)' : 'var(--border)'}`, background: theme===id ? 'var(--orange-dim)' : 'var(--bg-elevated)', cursor:'pointer', textAlign:'left', transition:'var(--transition)' }}>
                  <p style={{ fontSize:'1.2rem', marginBottom:'0.25rem' }}>{label}</p>
                  <p style={{ fontSize:'12px', color: theme===id ? 'var(--orange-primary)' : 'var(--text-muted)' }}>{desc}</p>
                  {theme===id && <p style={{ fontSize:'10px', color:'var(--orange-primary)', fontWeight:600, marginTop:'0.25rem' }}>✓ Activo</p>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

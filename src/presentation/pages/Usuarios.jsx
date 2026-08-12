import { useState, useEffect } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
import { createClient } from '@supabase/supabase-js'
import { useRole } from '../../hooks/useRole'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cliente secundario para crear usuarios sin cerrar tu sesion de admin
const secondaryClient = createClient(supabaseUrl, supabaseAnonKey)

export default function Usuarios(){
  const { role } = useRole()
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ email:'', password:'', role:'almacenero' })
  const [loading, setLoading] = useState(false)

  const loadUsers = async ()=>{
    const { data } = await supabase.from('profiles').select('*').order('created_at',{ascending:false})
    if(data) setUsers(data)
  }
  useEffect(()=>{ loadUsers() },[])

  const handleCreate = async (e)=>{
    e.preventDefault()
    if(role!=='administrador'){ alert('Solo admin puede crear'); return }
    setLoading(true)
    try{
      // 1. Crear en Auth con el cliente secundario
      const { data, error } = await secondaryClient.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if(error) throw error
      const userId = data.user?.id
      if(!userId) throw new Error('No se pudo crear usuario en Auth')

      // 2. Crear su perfil con su rol
      const { error: profileError } = await supabase.from('profiles').insert({
        id: userId,
        email: form.email,
        role: form.role
      })
      if(profileError) throw profileError

      alert(`✅ Usuario creado: ${form.email} como ${form.role}`)
      setForm({email:'', password:'', role:'almacenero'})
      loadUsers()
    }catch(err){
      alert('Error: '+ err.message)
    }finally{
      setLoading(false)
    }
  }

  const handleDeleteUser = async (id, email)=>{
    if(!confirm(`¿Borrar usuario ${email}? Esto no borra de Auth, solo de la lista, debes borrarlo tambien en Supabase Auth.`)) return
    await supabase.from('profiles').delete().eq('id', id)
    loadUsers()
  }

  if(role!=='administrador'){
    return <div style={{padding:'20px'}}><h2>Acceso denegado</h2><p>Solo el administrador puede gestionar usuarios.</p></div>
  }

  return (
    <div style={{maxWidth:'900px'}}>
      <h1>Gestión de Usuarios</h1>
      <p style={{fontSize:'13px', color:'#666'}}>Aquí creas cuentas para tus almaceneros. Ellos entrarán con email y contraseña que tú les des.</p>

      <form onSubmit={handleCreate} style={{background:'#fff', padding:'20px', borderRadius:'10px', margin:'20px 0', border:'1px solid #eee', display:'grid', gap:'12px'}}>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px'}}>
          <div className="field"><label>Email trabajador</label><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="almacenero2@brahmco.com" required/></div>
          <div className="field"><label>Contraseña inicial</label><input type="text" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="123456" required/></div>
          <div className="field"><label>Rol</label><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="almacenero">Almacenero (solo entrada/salida)</option><option value="administrador">Administrador (todo + reportes)</option></select></div>
        </div>
        <button className="btn-primary" disabled={loading}>{loading?'Creando...':' + Crear Usuario'}</button>
      </form>

      <div className="table-wrap"><table><thead><tr><th>Email</th><th>Rol</th><th>Fecha</th><th>Accion</th></tr></thead>
      <tbody>{users.map(u=>(
        <tr key={u.id}><td>{u.email}</td><td><span className="badge" style={{background: u.role==='administrador'?'#dcfce7':'#e0f2fe'}}>{u.role}</span></td><td>{new Date(u.created_at).toLocaleDateString()}</td><td><button className="btn ghost" onClick={()=>handleDeleteUser(u.id, u.email)}>Quitar</button></td></tr>
      ))}</tbody></table></div>

      <div style={{marginTop:'20px', fontSize:'12px', background:'#fef3c7', padding:'12px', borderRadius:'8px'}}>
        <strong>Nota PRO:</strong> Por seguridad de Supabase, borrar aquí solo lo quita de tu lista. Para borrarlo completamente ve a Supabase Dashboard → Authentication → Users → Delete user. En la v2 del sistema lo hacemos con una Edge Function automática.
      </div>
    </div>
  )
}
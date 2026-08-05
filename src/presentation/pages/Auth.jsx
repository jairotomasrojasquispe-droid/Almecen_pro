import React, { useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client.js'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a'}}>
      <form onSubmit={handleLogin} style={{background:'white', padding:30, borderRadius:12, width:320}}>
        <h2 style={{marginBottom:20, color:'#0f172a'}}>BRAHMCO TALLER</h2>
        <input style={{width:'100%', padding:10, marginBottom:10}} placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input style={{width:'100%', padding:10, marginBottom:20}} type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
        <button style={{width:'100%', padding:10, background:'#0f172a', color:'white', border:'none', borderRadius:8}} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
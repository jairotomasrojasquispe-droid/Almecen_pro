import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../infrastructure/supabase/client'
import { LayoutDashboard, Package, History, BarChart3, LogOut } from 'lucide-react'

export default function Layout({children}){
  const loc = useLocation()
  const nav = useNavigate()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(()=>{
    const goOnline = ()=> setOnline(true)
    const goOffline = ()=> setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return ()=>{
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  },[])

  const logout = async ()=>{
    await supabase.auth.signOut()
    nav('/login')
  }

  const Item = ({to, icon:Icon, label}) => (
    <Link to={to} className={`nav-item ${loc.pathname===to?'active':''}`}><Icon size={18}/>{label}</Link>
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="logo">BRAHMCO<span>TALLER PRO</span></div>
        <nav className="nav">
          <Item to="/" icon={LayoutDashboard} label="Dashboard" />
          <Item to="/productos" icon={Package} label="Productos" />
          <Item to="/kardex" icon={History} label="Kardex Tiempo Real" />
          <Item to="/reportes" icon={BarChart3} label="Reportes" />
        </nav>
        <div className="sidebar-bottom">
          <div style={{
            marginBottom:'10px',
            padding:'6px 10px',
            borderRadius:'20px',
            fontSize:'11px',
            fontWeight:800,
            textAlign:'center',
            background: online ? '#dcfce7' : '#fee2e2',
            color: online ? '#166534' : '#991b1b',
            border: `1px solid ${online ? '#86efac' : '#fecaca'}`
          }}>
            {online ? '🟢 Online - Sincronizado' : '🔴 Offline - Local'}
          </div>
          <button className="btn-logout" onClick={logout}><LogOut size={16}/>Cerrar Sesion</button>
          <small>v4.0 PRO - Multi-dispositivo {online ? '🟢' : '🔴'}</small>
        </div>
      </aside>
      <main className="main"><div className="content">{children}</div></main>
    </div>
  )
}
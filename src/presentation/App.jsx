import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Auth from './pages/Auth.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Productos from './pages/Productos.jsx'
import Kardex from './pages/Kardex.jsx'
import Reportes from './pages/Reportes.jsx'
import { supabase } from '../infrastructure/supabase/client.js'
import Usuarios from "./pages/Usuarios.jsx";

export default function App(){
  const [user,setUser]=React.useState(null)
  const [loading,setLoading]=React.useState(true)
  React.useEffect(()=>{
    supabase.auth.getSession().then(({data})=>{setUser(data.session?.user??null); setLoading(false)})
    const {data:l}=supabase.auth.onAuthStateChange((_,s)=>setUser(s?.user??null))
    return()=>l.subscription.unsubscribe()
  },[])
  if(loading) return <div style={{padding:20}}>Cargando...</div>
  if(!user) return <Auth />
  return (
    <Layout user={user}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/kardex" element={<Kardex />} />
        <Route path="/reportes" element={<Reportes />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/usuarios" element={<Usuarios/>} />
      </Routes>
    </Layout>
  )
}
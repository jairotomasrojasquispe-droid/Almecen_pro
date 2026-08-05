import { useEffect, useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
import { useRealtime } from '../hooks/useRealtime'
import { getProductosLocal, getPendientes, dbPromise } from '../../pwa/offlineDB.js'

export default function Dashboard(){
  const [products,setProducts]=useState([])
  const [movs,setMovs]=useState([])
  const [online,setOnline]=useState(navigator.onLine)
  const [pendientes,setPendientes]=useState([])

  useEffect(()=>{
    const onOnline = ()=>setOnline(true)
    const onOffline = ()=>setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return ()=>{ window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline) }
  },[])

  const load = async ()=>{
    try{
      const { data: prods } = await supabase.from('products').select('*').order('stock',{ascending:true})
      const { data: movements } = await supabase.from('movements').select('*, products(nombre)').order('created_at',{ascending:false}).limit(50)
      if(prods) {
        setProducts(prods)
        // guarda copia local para cuando no haya internet
        const db = await dbPromise
        const tx = db.transaction('productos','readwrite')
        for(const p of prods) tx.store.put(p)
        await tx.done
      }
      if(movements) {
        setMovs(movements)
        const db = await dbPromise
        if(!db.objectStoreNames.contains('movimientos_cache')){
          // si no existe, lo ignora, pero lo creamos en offlineDB.js v2
        } else {
          const tx2 = db.transaction('movimientos_cache','readwrite')
          await tx2.store.clear()
          for(const m of movements) tx2.store.put(m)
          await tx2.done
        }
      }
    }catch(e){
      console.log('Offline Dashboard - cargando local', e)
      const localProds = await getProductosLocal()
      setProducts(localProds)
      // intenta cargar movimientos del cache local
      try{
        const db = await dbPromise
        if(db.objectStoreNames.contains('movimientos_cache')){
          const localMovs = await db.getAll('movimientos_cache')
          setMovs(localMovs)
        }
      }catch{}
    }
    const p = await getPendientes()
    setPendientes(p)
  }

  useEffect(()=>{ load() },[])
  useRealtime('products', load)
  useRealtime('movements', load)

  const low = products.filter(p=>p.stock <= p.stock_minimo)
  const prestados = movs.filter(m=>m.estado==='PRESTADO')
  const agotados = products.filter(p=>p.stock===0)
  const valorReponer = low.reduce((a,p)=> a + ((p.stock_minimo*2 - p.stock)*p.costo), 0)

  const devolver = async (m)=>{
    if(!online){
      alert('🔴 Sin internet: No puedes devolver herramientas offline. Conéctate para sincronizar.')
      return
    }
    const prod = products.find(pr=>pr.id===m.product_id)
    if(prod){ await supabase.from('products').update({stock: prod.stock + m.cantidad}).eq('id', prod.id) }
    await supabase.from('movements').update({estado:'DEVUELTO'}).eq('id', m.id)
    load()
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1>Dashboard - Tiempo Real {online? '🟢' : '🔴 Offline'}</h1>
        {pendientes.length>0 && <span style={{background:'#f59e0b', color:'white', padding:'6px 12px', borderRadius:'20px', fontSize:'12px'}}>{pendientes.length} movimientos pendientes por subir</span>}
      </div>

      <div className="cards">
        <div className="card"><h3>Total Productos</h3><h2>{products.length}</h2><small>{online? 'desde Supabase' : 'desde copia local'}</small></div>
        <div className="card danger"><h3>Stock Bajo</h3><h2>{low.length}</h2><small>{agotados.length} agotados</small></div>
        <div className="card warn"><h3>Prestadas sin Devolver</h3><h2>{prestados.length}</h2></div>
        <div className="card ok"><h3>Valor a Reponer</h3><h2>S/ {valorReponer.toFixed(2)}</h2></div>
      </div>

      <div className="table-wrap">
        <h3>🚨 Productos que requieren COMPRA INMEDIATA - Cual comprar</h3>
        <p style={{color:'#64748b', fontSize:'13px'}}>Ordenados por criticidad: agotados primero. { !online && 'Mostrando copia local.'}</p>
        <table><thead><tr><th>Foto</th><th>Producto / SKU</th><th>Stock Actual</th><th>Min</th><th>Faltante</th><th>Ubicacion</th><th>Proveedor</th><th>Accion</th></tr></thead>
        <tbody>{low.map(p=>(
          <tr key={p.id} style={{background: p.stock===0?'#fef2f2':''}}>
            <td>{p.imagen_url ? <img src={p.imagen_url} className="thumb"/> : <div className="thumb placeholder">🔧</div>}</td>
            <td><strong>{p.nombre}</strong><br/><code>{p.sku}</code> - {p.categoria}<br/><span className={`badge ${p.stock===0?'badge-danger':'badge-warn'}`}>{p.stock===0?'AGOTADO - COMPRAR YA':'STOCK BAJO'}</span></td>
            <td style={{color: p.stock===0?'#dc2626':'#d97706', fontWeight:800}}>{p.stock}</td>
            <td>{p.stock_minimo}</td>
            <td style={{fontWeight:700}}>+{p.stock_minimo*2 - p.stock} unidades</td>
            <td>{p.ubicacion}</td><td>{p.proveedor}</td>
            <td><button className="btn" onClick={()=>window.location='/productos'}>Comprar</button></td>
          </tr>
        ))}</tbody></table>
        {low.length===0 && <p style={{padding:'20px', textAlign:'center', color:'#64748b'}}>✅ Todo el stock está OK { !online && '(copia local)'}</p>}
      </div>

      <div className="table-wrap" style={{marginTop:'20px'}}>
        <h3>🔧 Herramientas prestadas - Quien las tiene (Tiempo Real)</h3>
        <table><thead><tr><th>Trabajador / Foto</th><th>Herramienta</th><th>Cant</th><th>Area Destino</th><th>Fecha</th><th>Accion</th></tr></thead>
        <tbody>{prestados.map(m=>(
          <tr key={m.id}><td style={{display:'flex',gap:'8px',alignItems:'center'}}>{m.trabajador_foto_url ? <img src={m.trabajador_foto_url} className="avatar"/> : <div className="avatar">👷</div>}<div><strong>{m.entregado_a}</strong><br/><small>{m.area_destino}</small></div></td><td>{m.products?.nombre}</td><td>{m.cantidad}</td><td>{m.area_destino}</td><td>{new Date(m.created_at).toLocaleString()}</td><td><button className="btn" onClick={()=>devolver(m)} disabled={!online}>Marcar Devuelto</button></td></tr>
        ))}</tbody></table>
        {prestados.length===0 && <p style={{padding:'20px', textAlign:'center', color:'#64748b'}}>No hay herramientas prestadas</p>}
      </div>
    </div>
  )
}
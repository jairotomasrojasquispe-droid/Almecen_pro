import { useEffect, useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
import { useRealtime } from '../hooks/useRealtime'
import { dbPromise, saveProductosLocal, getProductosLocal, addMovimientoPendiente, getPendientes, clearPendiente } from "../../pwa/offlineDB.js";

export default function Productos(){
  const [products,setProducts]=useState([])
  const [online,setOnline]=useState(navigator.onLine)
  const [pendientesCount,setPendientesCount]=useState(0)
  const [show,setShow]=useState(false)
  const [form,setForm]=useState({sku:'',nombre:'',categoria:'Herramienta',stock:1,stock_minimo:1,costo:0,ubicacion:'',proveedor:''})
  const [file,setFile]=useState(null); const [preview,setPreview]=useState('')
  const [movShow,setMovShow]=useState(null); const [movForm,setMovForm]=useState({tipo:'ENTRADA',cantidad:1,entregado_a:'',area_destino:'Taller Mecanico',motivo:'Uso diario',estado:'ENTREGADO',proveedor:'',factura:'',costo_unit:0})
  const [workerFile,setWorkerFile]=useState(null); const [workerPreview,setWorkerPreview]=useState('')

  // Detecta online/offline
  useEffect(()=>{
    const goOnline = async ()=>{ setOnline(true); await syncPendientes() }
    const goOffline = ()=> setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    checkPendientes()
    return ()=>{ window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  },[])

  const checkPendientes = async ()=>{
    const p = await getPendientes()
    setPendientesCount(p.length)
  }

  // Carga con fallback offline
  const load = async ()=>{
    try{
      const {data, error} = await supabase.from('products').select('*').order('created_at',{ascending:false})
      if(error) throw error
      if(data){ setProducts(data); await saveProductosLocal(data) }
    }catch(e){
      console.log('Sin internet, cargando local', e)
      const local = await getProductosLocal()
      setProducts(local)
    }
    checkPendientes()
  }

  useEffect(()=>{load()},[]); useRealtime('products', load)

  // Sincroniza todo lo pendiente cuando vuelve internet
  const syncPendientes = async ()=>{
    const pendientes = await getPendientes()
    if(pendientes.length===0) return
    console.log(`Sincronizando ${pendientes.length} movimientos...`)
    for(const mov of pendientes){
      try{
        if(mov._type === 'NEW_PRODUCT'){
          const { error } = await supabase.from('products').insert(mov.payload)
          if(error) throw error
        } else {
          // movimiento normal
          await supabase.from('products').update({stock: mov.newStock}).eq('id', mov.product_id)
          await supabase.from('movements').insert(mov.payload)
        }
        await clearPendiente(mov.tempId)
      }catch(err){ console.log('Error sync', err); break }
    }
    await load()
    alert(`Sincronizado: ${pendientes.length} movimientos subidos a Supabase`)
  }

  const uploadImage = async (bucket, file)=>{
    if(!file) return null
    if(!online) return null // sin internet no sube imagen, se guarda sin foto
    const name = `${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from(bucket).upload(name, file)
    if(error){ console.log(error); return null }
    const { data } = supabase.storage.from(bucket).getPublicUrl(name)
    return data.publicUrl
  }

  const saveProduct = async (e)=>{
    e.preventDefault()
    let url = null
    if(file) url = await uploadImage('productos', file)
    const payload = { sku: form.sku, nombre: form.nombre, categoria: form.categoria, stock: parseInt(form.stock), stock_minimo: parseInt(form.stock_minimo), costo: parseFloat(form.costo), ubicacion: form.ubicacion, proveedor: form.proveedor, imagen_url: url }

    try{
      const { error } = await supabase.from('products').insert(payload)
      if(error) throw error
      setShow(false); load(); setForm({sku:'',nombre:'',categoria:'Herramienta',stock:1,stock_minimo:1,costo:0,ubicacion:'',proveedor:''}); setFile(null); setPreview('')
    }catch(err){
      // OFFLINE: guardalo local
      const tempProduct = {...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString() }
      const db = await dbPromise
      await db.put('productos', tempProduct)
      await addMovimientoPendiente({ tempId: Date.now().toString(), _type:'NEW_PRODUCT', payload })
      setProducts(prev=>[tempProduct,...prev])
      setShow(false)
      alert('🔴 Sin internet: Producto guardado offline. Se subirá cuando vuelva la conexión.')
      checkPendientes()
    }
  }

  const saveMovement = async (e)=>{
    e.preventDefault()
    let workerUrl = null
    if(workerFile) workerUrl = await uploadImage('trabajadores', workerFile)
    const prod = products.find(p=>p.id===movShow)
    let newStock = prod.stock
    if(movForm.tipo==='ENTRADA') newStock += parseInt(movForm.cantidad); else newStock -= parseInt(movForm.cantidad)
    if(newStock<0){ alert('Stock insuficiente'); return }

    const movPayload = { product_id: prod.id, tipo: movForm.tipo, cantidad: parseInt(movForm.cantidad), entregado_a: movForm.entregado_a, trabajador_foto_url: workerUrl, area_destino: movForm.area_destino, motivo: movForm.motivo, estado: movForm.estado, proveedor: movForm.proveedor, factura: movForm.factura, costo_unit: parseFloat(movForm.costo_unit||0) }

    try{
      await supabase.from('products').update({stock:newStock}).eq('id', prod.id)
      await supabase.from('movements').insert(movPayload)
      setMovShow(null); load()
    }catch(err){
      // OFFLINE
      const db = await dbPromise
      await db.put('productos', {...prod, stock: newStock})
      await addMovimientoPendiente({ product_id: prod.id, newStock, payload: movPayload })
      setProducts(prev=>prev.map(p=>p.id===prod.id? {...p, stock:newStock} : p))
      setMovShow(null)
      alert('🔴 Sin internet: Movimiento guardado offline. Stock actualizado local.')
      checkPendientes()
    }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <h1>Productos y Herramientas</h1>
          <div style={{fontSize:'12px'}}>{online? '🟢 Online - Supabase' : '🔴 Offline - Trabajando local'} {pendientesCount>0 && <span style={{background:'#f59e0b', color:'white', padding:'2px 8px', borderRadius:'10px', marginLeft:'8px'}}>{pendientesCount} pendientes</span>}</div>
        </div>
        <div style={{display:'flex', gap:'8px'}}>
          {pendientesCount>0 && online && <button className="btn" onClick={syncPendientes}>Sincronizar {pendientesCount}</button>}
          <button className="btn-primary" onClick={()=>setShow(true)}>+ Nuevo Producto</button>
        </div>
      </div>

      <div className="table-wrap"><table><thead><tr><th>Foto</th><th>SKU/Nombre</th><th>Cat</th><th>Stock</th><th>Costo</th><th>Valor</th><th>Ubicacion</th><th>Acciones</th></tr></thead>
      <tbody>{products.map(p=>(
        <tr key={p.id}><td>{p.imagen_url? <img src={p.imagen_url} className="thumb"/> : <div className="thumb placeholder">📦</div>}</td>
        <td><strong>{p.nombre}</strong><br/><code>{p.sku}</code> {String(p.id).startsWith('temp-') && <span style={{fontSize:'10px', color:'#f59e0b'}}>OFFLINE</span>}</td><td><span className="badge">{p.categoria}</span></td>
        <td>{p.stock}/{p.stock_minimo} {p.stock<=p.stock_minimo && <span className="badge badge-danger">BAJO</span>}</td><td>S/ {p.costo}</td><td>S/ {(p.stock*p.costo).toFixed(2)}</td><td>{p.ubicacion}</td>
        <td><button className="btn" onClick={()=>{setMovShow(p.id); setMovForm({...movForm,tipo:'ENTRADA'})}}>Entrada</button> <button className="btn ghost" onClick={()=>{setMovShow(p.id); setMovForm({...movForm,tipo:'SALIDA'})}}>Salida</button></td></tr>
      ))}</tbody></table></div>

      {show && <div className="modal open"><div className="modal-box">
        <h3>Nuevo Producto - Con Foto Herramienta</h3>
        <form onSubmit={saveProduct}>
          <div className="grid2"><div className="field"><label>SKU *</label><input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} required/></div><div className="field"><label>Categoria</label><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}><option>Herramienta</option><option>Material</option><option>EPP</option><option>Insumo</option></select></div></div>
          <div className="field"><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/></div>
          <div className="grid2"><div className="field"><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></div><div className="field"><label>Minimo</label><input type="number" value={form.stock_minimo} onChange={e=>setForm({...form,stock_minimo:e.target.value})}/></div></div>
          <div className="grid2"><div className="field"><label>Costo S/</label><input type="number" step="0.01" value={form.costo} onChange={e=>setForm({...form,costo:e.target.value})}/></div><div className="field"><label>Ubicacion</label><input value={form.ubicacion} onChange={e=>setForm({...form,ubicacion:e.target.value})}/></div></div>
          <div className="field"><label>Proveedor</label><input value={form.proveedor} onChange={e=>setForm({...form,proveedor:e.target.value})}/></div>
          <div className="field"><label>Foto Herramienta / Producto {!online && "(no disponible offline)"}</label><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0]))}}/><img src={preview} className="preview" style={{display: preview?'block':'none', width:'100px'}}/></div>
          <div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button type="button" className="btn ghost" onClick={()=>setShow(false)}>Cancelar</button><button className="btn-primary">{online? 'Guardar en Supabase' : 'Guardar Offline'}</button></div>
        </form>
      </div></div>}

      {movShow && <div className="modal open"><div className="modal-box">
        <h3>{movForm.tipo} - {products.find(p=>p.id===movShow)?.nombre}</h3>
        <form onSubmit={saveMovement}>
          <div className="grid2"><div className="field"><label>Tipo</label><select value={movForm.tipo} onChange={e=>setMovForm({...movForm,tipo:e.target.value})}><option>ENTRADA</option><option>SALIDA</option></select></div><div className="field"><label>Cantidad</label><input type="number" value={movForm.cantidad} onChange={e=>setMovForm({...movForm,cantidad:e.target.value})} required/></div></div>
          {movForm.tipo==='SALIDA'? <>
            <div className="field"><label>Entregado a *</label><input value={movForm.entregado_a} onChange={e=>setMovForm({...movForm,entregado_a:e.target.value})} required placeholder="Carlos Quispe"/></div>
            <div className="field"><label>Foto Trabajador {!online && "(sin foto offline)"}</label><input type="file" accept="image/*" onChange={e=>{setWorkerFile(e.target.files[0]); setWorkerPreview(URL.createObjectURL(e.target.files[0]))}}/><img src={workerPreview} style={{width:'80px',height:'80px',borderRadius:'50%',display: workerPreview?'block':'none'}}/></div>
            <div className="grid2"><div className="field"><label>Area Destino</label><select value={movForm.area_destino} onChange={e=>setMovForm({...movForm,area_destino:e.target.value})}><option>Taller Mecanico</option><option>Obra San Miguel</option><option>Mantenimiento</option><option>Almacen Central</option></select></div><div className="field"><label>Estado</label><select value={movForm.estado} onChange={e=>setMovForm({...movForm,estado:e.target.value})}><option>ENTREGADO</option><option>PRESTADO</option></select></div></div>
            <div className="field"><label>Motivo</label><select value={movForm.motivo} onChange={e=>setMovForm({...movForm,motivo:e.target.value})}><option>Uso diario</option><option>Prestamo herramienta</option><option>Reparacion</option><option>Obra</option></select></div>
          </> : <>
            <div className="grid2"><div className="field"><label>Proveedor</label><input value={movForm.proveedor} onChange={e=>setMovForm({...movForm,proveedor:e.target.value})}/></div><div className="field"><label>Factura</label><input value={movForm.factura} onChange={e=>setMovForm({...movForm,factura:e.target.value})}/></div></div>
            <div className="field"><label>Costo Unit</label><input type="number" step="0.01" value={movForm.costo_unit} onChange={e=>setMovForm({...movForm,costo_unit:e.target.value})}/></div>
          </>}
          <div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button type="button" className="btn ghost" onClick={()=>setMovShow(null)}>Cancelar</button><button className="btn-primary">Registrar {movForm.tipo} {!online && "(Offline)"}</button></div>
        </form>
      </div></div>}
    </div>
  )
}
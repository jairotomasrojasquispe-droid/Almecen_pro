import { useRole } from '../../hooks/useRole'
import { useEffect, useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
import { useRealtime } from '../hooks/useRealtime'
import { dbPromise, saveProductosLocal, getProductosLocal, addMovimientoPendiente, getPendientes, clearPendiente } from "../../pwa/offlineDB.js";

export default function Productos(){
  const { role } = useRole()
  const [products,setProducts]=useState([])
  const [online,setOnline]=useState(navigator.onLine)
  const [pendientesCount,setPendientesCount]=useState(0)
  const [show,setShow]=useState(false)
  const [form,setForm]=useState({sku:'',nombre:'',categoria:'Herramienta',stock:1,stock_minimo:1,costo:0,ubicacion:'',proveedor:''})
  const [file,setFile]=useState(null); const [preview,setPreview]=useState('')
  const [movShow,setMovShow]=useState(null);
  const [movForm,setMovForm]=useState({tipo:'ENTRADA',cantidad:1,entregado_a:'',area_destino:'Taller Mecanico',motivo:'Uso diario',estado:'ENTREGADO',proveedor:'',factura:'',costo_unit:0, observacion:''})
  const [workerFile,setWorkerFile]=useState(null); const [workerPreview,setWorkerPreview]=useState('')

  useEffect(()=>{
    const goOnline = async ()=>{ setOnline(true); await syncPendientes() }
    const goOffline = ()=> setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    checkPendientes()
    return ()=>{ window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline) }
  },[])

  const checkPendientes = async ()=>{ const p = await getPendientes(); setPendientesCount(p.length) }
  const load = async ()=>{
    try{
      const {data} = await supabase.from('products').select('*').order('created_at',{ascending:false})
      if(data){ setProducts(data); await saveProductosLocal(data) }
    }catch(e){
      const local = await getProductosLocal(); setProducts(local)
    }
    checkPendientes()
  }
  useEffect(()=>{load()},[]); useRealtime('products', load)

  const syncPendientes = async ()=>{
    const pendientes = await getPendientes()
    if(pendientes.length===0) return
    for(const mov of pendientes){
      try{
        if(mov._type === 'NEW_PRODUCT'){
          await supabase.from('products').insert(mov.payload)
        } else {
          await supabase.from('products').update({stock: mov.newStock}).eq('id', mov.product_id)
          await supabase.from('movements').insert(mov.payload)
        }
        await clearPendiente(mov.tempId)
      }catch(err){ break }
    }
    await load()
  }

  const uploadImage = async (bucket, file)=>{
    if(!file ||!online) return null
    const name = `${Date.now()}-${file.name}`
    await supabase.storage.from(bucket).upload(name, file)
    const { data } = supabase.storage.from(bucket).getPublicUrl(name)
    return data.publicUrl
  }

    const saveProduct = async (e)=>{
    e.preventDefault()
    let url = file? await uploadImage('productos', file) : null
    const stockInicial = parseInt(form.stock)
    const costoInicial = parseFloat(form.costo)
    const payload = { sku: form.sku, nombre: form.nombre, categoria: form.categoria, stock: stockInicial, stock_minimo: parseInt(form.stock_minimo), costo: costoInicial, ubicacion: form.ubicacion, proveedor: form.proveedor, imagen_url: url }
    try{
      // 1. Crea producto
      const { data: newProduct, error } = await supabase.from('products').insert(payload).select().single()
      if(error) throw error

      // 2. Crea su PRIMER movimiento de Kardex como COMPRA INICIAL (así no duplicas)
      if(newProduct){
        await supabase.from('movements').insert({
          product_id: newProduct.id,
          tipo: 'ENTRADA',
          cantidad: stockInicial,
          motivo: `Compra Inicial | ${form.proveedor||'Sin proveedor'} | Costo S/ ${costoInicial}`,
          proveedor: form.proveedor,
          costo_unit: costoInicial,
          area_destino: 'Almacen Central',
          estado: 'ENTREGADO'
        })
      }

      setShow(false); load(); setForm({sku:'',nombre:'',categoria:'Herramienta',stock:1,stock_minimo:1,costo:0,ubicacion:'',proveedor:''}); setFile(null); setPreview('')
    }catch(err){
      const tempProduct = {...payload, id: `temp-${Date.now()}`, created_at: new Date().toISOString() }
      const db = await dbPromise; await db.put('productos', tempProduct)
      await addMovimientoPendiente({ tempId: Date.now().toString(), _type:'NEW_PRODUCT', payload })
      setProducts(prev=>[tempProduct,...prev]); setShow(false)
    }
  }

  const saveMovement = async (e)=>{
    e.preventDefault()
    let workerUrl = workerFile? await uploadImage('trabajadores', workerFile) : null
    const prod = products.find(p=>p.id===movShow)
    let newStock = prod.stock + (movForm.tipo==='ENTRADA'? parseInt(movForm.cantidad) : -parseInt(movForm.cantidad))
    if(newStock<0){ alert('Stock insuficiente'); return }

    // Si es ajuste o devolucion, guarda el motivo + observacion
    let motivoFinal = movForm.motivo
    if(movForm.motivo === 'Ajuste de stock' || movForm.motivo.includes('Devolucion')){
      motivoFinal = movForm.observacion? `${movForm.motivo} | ${movForm.observacion}` : movForm.motivo
    }

    const movPayload = { product_id: prod.id, tipo: movForm.tipo, cantidad: parseInt(movForm.cantidad), entregado_a: movForm.entregado_a, trabajador_foto_url: workerUrl, area_destino: movForm.area_destino, motivo: motivoFinal, estado: movForm.estado, proveedor: movForm.proveedor, factura: movForm.factura, costo_unit: parseFloat(movForm.costo_unit||0) }
    try{
      await supabase.from('products').update({stock:newStock}).eq('id', prod.id)
      await supabase.from('movements').insert(movPayload)
      setMovShow(null); load(); setWorkerFile(null); setWorkerPreview(''); setMovForm(prev=>({...prev, observacion:'', entregado_a:''}))
    }catch(err){
      const db = await dbPromise; await db.put('productos', {...prod, stock: newStock})
      await addMovimientoPendiente({ product_id: prod.id, newStock, payload: movPayload })
      setProducts(prev=>prev.map(p=>p.id===prod.id? {...p, stock:newStock} : p)); setMovShow(null)
    }
  }

  const handleDelete = async (product)=>{
    if(role!== 'administrador'){ alert('No tienes permiso'); return }
    if(!confirm(`¿Seguro que quieres BORRAR "${product.nombre}"?`)) return
    try{
      await supabase.from('movements').delete().eq('product_id', product.id)
      const { error } = await supabase.from('products').delete().eq('id', product.id)
      if(error) throw error
      const db = await dbPromise; await db.delete('productos', product.id)
      setProducts(prev=>prev.filter(p=>p.id!== product.id))
    }catch(e){ alert('Error al borrar: ' + e.message) }
  }

  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between', alignItems:'center'}}>
        <div><h1>Productos y Herramientas</h1><div style={{fontSize:'12px'}}>{online? '🟢 Online' : '🔴 Offline'} {pendientesCount>0 && <span> {pendientesCount} pendientes</span>}</div></div>
        <div style={{display:'flex', gap:'8px'}}>
          {pendientesCount>0 && online && <button className="btn" onClick={syncPendientes}>Sincronizar {pendientesCount}</button>}
          <button className="btn-primary" onClick={()=>setShow(true)}>+ Nuevo Producto</button>
        </div>
      </div>

      <div className="table-wrap"><table><thead><tr><th>Foto</th><th>SKU/Nombre</th><th>Cat</th><th>Stock</th><th>Costo</th><th>Valor</th><th>Ubicacion</th><th>Acciones</th></tr></thead>
      <tbody>{products.map(p=>(
        <tr key={p.id}><td>{p.imagen_url? <img src={p.imagen_url} className="thumb"/> : <div className="thumb placeholder">📦</div>}</td>
        <td><strong>{p.nombre}</strong><br/><code>{p.sku}</code></td><td><span className="badge">{p.categoria}</span></td>
        <td>{p.stock}/{p.stock_minimo}</td><td>S/ {p.costo}</td><td>S/ {(p.stock*p.costo).toFixed(2)}</td><td>{p.ubicacion}</td>
        <td style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          <button className="btn" onClick={()=>{setMovShow(p.id); setMovForm(prev=>({...prev,tipo:'ENTRADA', motivo:'Compra'}))}}>Entrada</button>
          <button className="btn ghost" onClick={()=>{setMovShow(p.id); setMovForm(prev=>({...prev,tipo:'SALIDA', motivo:'Uso diario'}))}}>Salida</button>
          {role === 'administrador' && (
            <button className="btn" style={{background:'#fee2e2', color:'#991b1b'}} onClick={()=>handleDelete(p)}>🗑️</button>
          )}
        </td></tr>
      ))}</tbody></table></div>

      {show && <div className="modal open"><div className="modal-box"><h3>Nuevo Producto</h3><form onSubmit={saveProduct}><div className="grid2"><div className="field"><label>SKU *</label><input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} required/></div><div className="field"><label>Categoria</label><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}><option>Herramienta</option><option>Material</option><option>EPP</option><option>Insumo</option></select></div></div><div className="field"><label>Nombre *</label><input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} required/></div><div className="grid2"><div className="field"><label>Stock</label><input type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></div><div className="field"><label>Minimo</label><input type="number" value={form.stock_minimo} onChange={e=>setForm({...form,stock_minimo:e.target.value})}/></div></div><div className="grid2"><div className="field"><label>Costo S/</label><input type="number" step="0.01" value={form.costo} onChange={e=>setForm({...form,costo:e.target.value})}/></div><div className="field"><label>Ubicacion</label><input value={form.ubicacion} onChange={e=>setForm({...form,ubicacion:e.target.value})}/></div></div><div className="field"><label>Proveedor</label><input value={form.proveedor} onChange={e=>setForm({...form,proveedor:e.target.value})}/></div><div className="field"><label>Foto</label><input type="file" accept="image/*" onChange={e=>{setFile(e.target.files[0]); setPreview(URL.createObjectURL(e.target.files[0]))}}/><img src={preview} className="preview" style={{display: preview?'block':'none', width:'100px'}}/></div><div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button type="button" className="btn ghost" onClick={()=>setShow(false)}>Cancelar</button><button className="btn-primary">Guardar</button></div></form></div></div>}

      {movShow && <div className="modal open"><div className="modal-box">
        <h3>{movForm.tipo} - {products.find(p=>p.id===movShow)?.nombre}</h3>
        <form onSubmit={saveMovement}>
          <div className="grid2"><div className="field"><label>Tipo</label><select value={movForm.tipo} onChange={e=>setMovForm({...movForm,tipo:e.target.value})}><option>ENTRADA</option><option>SALIDA</option></select></div><div className="field"><label>Cantidad</label><input type="number" value={movForm.cantidad} onChange={e=>setMovForm({...movForm,cantidad:e.target.value})} required/></div></div>

          {movForm.tipo==='SALIDA'? <>
            <div className="field"><label>Entregado a *</label><input value={movForm.entregado_a} onChange={e=>setMovForm({...movForm,entregado_a:e.target.value})} required placeholder="Carlos Quispe"/></div>
            <div className="field"><label>Foto Trabajador</label><input type="file" accept="image/*" onChange={e=>{setWorkerFile(e.target.files[0]); setWorkerPreview(URL.createObjectURL(e.target.files[0]))}}/><img src={workerPreview} style={{width:'80px',height:'80px',borderRadius:'50%',display: workerPreview?'block':'none', marginTop:'8px'}}/></div>
            <div className="grid2">
              <div className="field"><label>Área Destino *</label><select value={movForm.area_destino} onChange={e=>setMovForm({...movForm,area_destino:e.target.value})}><option>Taller Mecanico</option><option>Obra San Miguel</option><option>Mantenimiento</option><option>Almacen Central</option><option>Obra Los Olivos</option><option>Cap: 303</option><option>Cap: 317</option><option>Cap: 324</option></select></div>
              <div className="field"><label>Estado</label><select value={movForm.estado} onChange={e=>setMovForm({...movForm,estado:e.target.value})}><option>ENTREGADO</option><option>PRESTADO</option></select></div>
            </div>
            <div className="field"><label>Motivo</label><select value={movForm.motivo} onChange={e=>setMovForm({...movForm,motivo:e.target.value})}><option>Uso diario</option><option>Prestamo herramienta</option><option>Reparacion</option><option>Obra</option><option>Instalacion</option></select></div>
          </> : <>
            <div className="field"><label>Motivo de Entrada *</label>
              <select value={movForm.motivo} onChange={e=>setMovForm({...movForm,motivo:e.target.value})}>
                <option>Compra</option>
                <option>Devolucion - Herramienta prestada</option>
                <option>Ajuste de stock</option>
              </select>
            </div>

            {movForm.motivo === 'Compra'? <>
              <div className="grid2"><div className="field"><label>Proveedor</label><input value={movForm.proveedor} onChange={e=>setMovForm({...movForm,proveedor:e.target.value})} placeholder="Ferreteria Malvinas"/></div><div className="field"><label>Factura</label><input value={movForm.factura} onChange={e=>setMovForm({...movForm,factura:e.target.value})} placeholder="F001-123"/></div></div>
              <div className="field"><label>Costo Unit</label><input type="number" step="0.01" value={movForm.costo_unit} onChange={e=>setMovForm({...movForm,costo_unit:e.target.value})}/></div>
            </> : <>
              <div className="field"><label>Devuelto por / Responsable</label><input value={movForm.entregado_a} onChange={e=>setMovForm({...movForm,entregado_a:e.target.value})} placeholder="Carlos Quispe - devolucion"/></div>
              <div className="field"><label>Detalle del motivo *</label>
                <textarea
                  value={movForm.observacion}
                  onChange={e=>setMovForm({...movForm, observacion:e.target.value})}
                  placeholder="Ej: Se encontró amoladora oxidada en PARADITA, no sirve. Ajuste por inventario fisico 13/08 - Jairo"
                  required
                  style={{width:'100%', minHeight:'70px', padding:'8px', borderRadius:'6px', border:'1px solid #ddd'}}
                />
              </div>
              <div style={{fontSize:'12px', background:'#dcfce7', padding:'8px', borderRadius:'6px'}}>✅ Esto quedará registrado con tu nombre y fecha en Kardex.</div>
            </>}
          </>}

          <div style={{display:'flex',gap:'10px',marginTop:'16px'}}><button type="button" className="btn ghost" onClick={()=>setMovShow(null)}>Cancelar</button><button className="btn-primary">Registrar {movForm.tipo}</button></div>
        </form>
      </div></div>}
    </div>
  )
}
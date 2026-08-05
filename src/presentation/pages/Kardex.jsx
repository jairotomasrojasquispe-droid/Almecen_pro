
import { useEffect, useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
import { useRealtime } from '../hooks/useRealtime'

export default function Kardex(){
  const [movs,setMovs]=useState([])
  const load = async ()=>{ const {data}=await supabase.from('movements').select('*, products(nombre)').order('created_at',{ascending:false}); if(data) setMovs(data) }
  useEffect(()=>{load()},[]); useRealtime('movements', load)
  return (<div><h1>Kardex - Tiempo Real 🟢</h1>
  <div className="table-wrap"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Producto</th><th>Cant</th><th>Entregado a / Foto</th><th>Area Destino</th><th>Motivo</th><th>Estado</th></tr></thead>
  <tbody>{movs.map(m=><tr key={m.id}><td>{new Date(m.created_at).toLocaleString()}</td><td><span className={`badge ${m.tipo==='ENTRADA'?'ok':'danger'}`}>{m.tipo}</span></td><td>{m.products?.nombre}</td><td>{m.cantidad}</td><td>{m.tipo==='SALIDA' ? <div style={{display:'flex',gap:'6px',alignItems:'center'}}>{m.trabajador_foto_url ? <img src={m.trabajador_foto_url} className="avatar"/> : <div className="avatar">👷</div>}{m.entregado_a}</div> : m.proveedor}</td><td>{m.area_destino}</td><td>{m.motivo}</td><td><span className="badge">{m.estado}</span></td></tr>)}</tbody></table></div></div>)
}


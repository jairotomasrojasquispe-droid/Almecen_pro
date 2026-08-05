
import { useEffect, useState } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
export default function Reportes(){
  const [products,setProducts]=useState([]); const [movs,setMovs]=useState([])
  useEffect(()=>{(async()=>{ const {data:p}=await supabase.from('products').select('*'); const {data:m}=await supabase.from('movements').select('*'); setProducts(p||[]); setMovs(m||[]) })()},[])
  const valor = products.reduce((a,p)=>a+p.stock*p.costo,0)
  const porArea = {}; movs.filter(m=>m.tipo==='SALIDA').forEach(m=>{ porArea[m.area_destino]=(porArea[m.area_destino]||0)+m.cantidad })
  return (<div><h1>Reportes</h1>
    <div className="cards"><div className="card"><h3>Valor Inventario</h3><h2>S/ {valor.toFixed(2)}</h2></div><div className="card"><h3>Productos</h3><h2>{products.length}</h2></div><div className="card"><h3>Salidas Mes</h3><h2>{movs.filter(m=>m.tipo==='SALIDA').length}</h2></div></div>
    <div className="table-wrap"><h3>Consumo por Area</h3><table><thead><tr><th>Area</th><th>Items</th></tr></thead><tbody>{Object.entries(porArea).map(([k,v])=><tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody></table></div>
  </div>)
}


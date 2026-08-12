import { useEffect, useState } from 'react'
import { supabase } from '../infrastructure/supabase/client'


export function useRole(){
  const [role, setRole] = useState(() => localStorage.getItem('myRole'))
  const [loading, setLoading] = useState(true)
  
  useEffect(()=>{
    const getRole = async()=>{
      const { data: {user} } = await supabase.auth.getUser()
      if(!user){ setLoading(false); return }
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if(data){
        setRole(data.role)
        localStorage.setItem('myRole', data.role)
      }
      setLoading(false)
    }
    getRole()
  },[])
  return { role, loading }
}
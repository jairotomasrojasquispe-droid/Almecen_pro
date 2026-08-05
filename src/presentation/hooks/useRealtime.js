
import { useEffect } from 'react'
import { supabase } from '../../infrastructure/supabase/client'
// Hook senior: suscribe a cambios en tiempo real en tabla y ejecuta callback
export function useRealtime(table, callback){
  useEffect(()=>{
    const channel = supabase.channel(`${table}-realtime`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        console.log(`[Realtime] ${table}:`, payload)
        callback(payload)
      })
      .subscribe()
    return ()=> supabase.removeChannel(channel)
  }, [table])
}

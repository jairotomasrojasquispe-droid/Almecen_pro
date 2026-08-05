
import { createClient } from '@supabase/supabase-js'
// Configuracion - lee de .env
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY
if(!url || !anon) console.warn('⚠️ Falta configurar VITE_SUPABASE_URL y ANON_KEY en .env')
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
  realtime: { params: { eventsPerSecond: 10 } }
})

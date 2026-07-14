import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variáveis de ambiente do Supabase não estão definidas no .env.local')
}

// Client para uso no BROWSER (Client Components, hooks, etc.)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
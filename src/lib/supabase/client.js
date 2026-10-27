import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  ''

const supabaseAnonKey =
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[AURA Security] Supabase credentials not found in environment variables. Define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your local .env file.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

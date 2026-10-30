import { createClient } from '@supabase/supabase-js'

function cleanEnv(val: any): string {
  if (!val || typeof val !== 'string') return ''
  return val.trim().replace(/^["']|["']$/g, '').trim()
}

const rawUrl = cleanEnv(
  (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  ''
)

const rawAnonKey = cleanEnv(
  (typeof process !== 'undefined' && process.env && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) ||
  ''
)

function isValidUrl(str: string): boolean {
  if (!str || typeof str !== 'string') return false
  try {
    const parsed = new URL(str)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const isSupabaseConfigured = Boolean(
  isValidUrl(rawUrl) && rawAnonKey && rawAnonKey !== 'placeholder-anon-key'
)

if (!isSupabaseConfigured) {
  console.warn(
    '[AURA Security] Supabase credentials not found. Define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your local .env file.'
  )
}

const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
})

export function createBrowserClient() {
  return supabase
}

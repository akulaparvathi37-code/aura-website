import { createClient } from '@supabase/supabase-js'

function cleanEnv(val) {
  if (!val || typeof val !== 'string') return ''
  return val.trim().replace(/^["']|["']$/g, '').trim()
}

const rawUrl = cleanEnv(
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)) ||
  ''
)

const rawAnonKey = cleanEnv(
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  (typeof process !== 'undefined' && process.env && (process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) ||
  ''
)

function isValidUrl(str) {
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
    '[AURA Client] Supabase credentials not configured in environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Running in resilient catalog fallback mode.'
  )
}

// Resilient fallback: Prevents createClient from throwing an uncaught synchronous exception
// during module evaluation on production deployments where env vars are still being configured.
const supabaseUrl = isSupabaseConfigured ? rawUrl : 'https://placeholder.supabase.co'
const supabaseAnonKey = isSupabaseConfigured ? rawAnonKey : 'placeholder-anon-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

import { createContext, useContext, useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch or create profile row in public.profiles
  const syncProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      return
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile does not exist yet; create it from Google user metadata
        const meta = currentUser.user_metadata || {}
        const newProfile = {
          id: currentUser.id,
          name: meta.full_name || meta.name || currentUser.email?.split('@')[0] || 'AURA Client',
          email: currentUser.email || '',
          avatar_url: meta.avatar_url || meta.picture || '',
        }

        const { data: inserted, error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (!insertError && inserted) {
          setProfile(inserted)
          return
        }
      }

      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.warn('Profile sync warning:', err)
    }
  }

  useEffect(() => {
    // 1. Initial session check
    supabase.auth
      .getSession()
      .then((res) => {
        const session = res?.data?.session ?? null
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          syncProfile(session.user)
        }
      })
      .catch((err) => {
        console.warn('Auth getSession note:', err?.message || err)
      })
      .finally(() => {
        setLoading(false)
      })

    // 2. Real-time auth state listener
    let subscription = null
    try {
      const authListener = supabase?.auth?.onAuthStateChange?.(async (event, currentSession) => {
        setSession(currentSession)
        setUser(currentSession?.user ?? null)

        if (currentSession?.user) {
          await syncProfile(currentSession.user)
        } else {
          setProfile(null)
        }

        setLoading(false)

        // Clean up OAuth tokens, PKCE codes, or errors from URL to prevent duplicate redemption
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          const hasOAuthParams =
            url.searchParams.has('code') ||
            url.searchParams.has('error') ||
            url.searchParams.has('error_description') ||
            url.hash.includes('access_token') ||
            url.hash.includes('refresh_token') ||
            url.hash.includes('error=')

          if (hasOAuthParams) {
            const oauthErr = url.searchParams.get('error_description') || url.searchParams.get('error')
            if (oauthErr) {
              console.warn('[AURA Auth] Google OAuth notice:', oauthErr)
            }
            const cleanPath = url.pathname === '/auth/callback' || url.pathname === '/callback' ? '/' : url.pathname
            window.history.replaceState(null, '', url.origin + cleanPath)
          }
        }
      })
      subscription = authListener?.data?.subscription
    } catch (err) {
      console.warn('Auth state change listener note:', err?.message || err)
    }

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  // Google OAuth Login
  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured) {
      const configErr = new Error(
        'Supabase credentials are not configured on this deployment. Please define VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Project Settings.'
      )
      console.error('[AURA Auth Error]:', configErr.message)
      throw configErr
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin,
        queryParams: {
          prompt: 'select_account',
          access_type: 'offline',
        },
      },
    })
    if (error) {
      console.error('Google Auth Error:', error.message)
      throw error
    }
    return data
  }

  // Logout
  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Logout error:', error.message)
    }
    setUser(null)
    setSession(null)
    setProfile(null)
  }

  // Update voluntary profile fields (Age, Gender, Name)
  const updateProfile = async ({ age, gender, name }) => {
    if (!user) return { error: 'Not authenticated' }

    const updates = {
      updated_at: new Date().toISOString(),
    }
    if (age !== undefined) updates.age = age === '' ? null : parseInt(age, 10)
    if (gender !== undefined) updates.gender = gender
    if (name !== undefined) updates.name = name

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (!error && data) {
      setProfile(data)
    }
    return { data, error }
  }

    const isAdmin =
      profile?.role === 'admin' ||
      profile?.is_admin === true ||
      user?.email === 'akulaavinash37@gmail.com'

    return (
      <AuthContext.Provider
        value={{
          user,
          session,
          profile,
          loading,
          isAuthenticated: !!user,
          isAdmin,
          signInWithGoogle,
          signOut,
          updateProfile,
        }}
      >
        {children}
      </AuthContext.Provider>
    )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

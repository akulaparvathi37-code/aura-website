import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)

const GUEST_STORAGE_KEY = 'aura_guest_wishlist'
const LEGACY_STORAGE_KEY = 'aura_saree_wishlist'

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const [wishlist, setWishlist] = useState([])

  // Load wishlist based on authenticated user or guest session
  useEffect(() => {
    let isCancelled = false

    const loadWishlist = async () => {
      if (!user) {
        // Guest user session: load from guest storage only
        try {
          const saved = localStorage.getItem(GUEST_STORAGE_KEY)
          if (!isCancelled) {
            setWishlist(saved ? JSON.parse(saved) : [])
          }
        } catch {
          if (!isCancelled) setWishlist([])
        }
        return
      }

      // Authenticated user session: load strictly from Supabase
      try {
        const { data: dbItems, error } = await supabase
          .from('wishlist_items')
          .select('product_id')
          .eq('user_id', user.id)

        if (error) {
          console.warn('Error fetching wishlist from Supabase:', error.message)
          if (!isCancelled) setWishlist([])
          return
        }

        if (isCancelled) return

        const dbIds = (dbItems || []).map((item) => String(item.product_id))
        setWishlist(dbIds)

        // Clear guest storage on authenticated session to prevent cross-contamination
        try {
          localStorage.removeItem(GUEST_STORAGE_KEY)
          localStorage.removeItem(LEGACY_STORAGE_KEY)
        } catch {}
      } catch (err) {
        console.warn('Wishlist Supabase sync error:', err)
        if (!isCancelled) setWishlist([])
      }
    }

    loadWishlist()

    // Realtime listener for authenticated user's wishlist changes
    let channel = null
    if (user?.id) {
      channel = supabase
        .channel(`wishlist-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wishlist_items',
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data } = await supabase
              .from('wishlist_items')
              .select('product_id')
              .eq('user_id', user.id)
            if (data && !isCancelled) {
              setWishlist(data.map((item) => String(item.product_id)))
            }
          }
        )
        .subscribe()
    }

    return () => {
      isCancelled = true
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  // Clear state when user logs out
  useEffect(() => {
    if (!user) {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {}
    }
  }, [user])

  const toggleWishlist = useCallback(
    async (productOrId) => {
      if (!productOrId) return
      const targetId = String(
        typeof productOrId === 'object' && productOrId !== null
          ? productOrId.id
          : productOrId
      )

      let wasLiked = false

      setWishlist((prev) => {
        wasLiked = prev.includes(targetId)
        const updated = wasLiked
          ? prev.filter((item) => item !== targetId)
          : [...prev, targetId]

        // If guest, persist locally to guest storage
        if (!user) {
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated))
          } catch {}
        }
        return updated
      })

      // Asynchronously sync with Supabase for authenticated user
      if (user) {
        try {
          if (wasLiked) {
            await supabase
              .from('wishlist_items')
              .delete()
              .eq('user_id', user.id)
              .eq('product_id', targetId)
          } else {
            await supabase
              .from('wishlist_items')
              .upsert(
                { user_id: user.id, product_id: targetId },
                { onConflict: 'user_id,product_id' }
              )
          }
        } catch (err) {
          console.warn('Error updating wishlist in Supabase:', err)
        }
      }
    },
    [user]
  )

  const isLiked = useCallback(
    (productOrId) => {
      if (!productOrId) return false
      const targetId = String(
        typeof productOrId === 'object' && productOrId !== null
          ? productOrId.id
          : productOrId
      )
      return wishlist.includes(targetId)
    },
    [wishlist]
  )

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggleWishlist,
        isLiked,
        count: wishlist.length,
      }}
    >
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const context = useContext(WishlistContext)
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider')
  }
  return context
}

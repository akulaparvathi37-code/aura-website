import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

const GUEST_STORAGE_KEY = 'aura_guest_cart'
const LEGACY_STORAGE_KEY = 'aura_shopping_cart'

/**
 * Extracts numeric price from either a formatted INR string (e.g. "₹28,500") or a number.
 */
export function parsePrice(price) {
  if (typeof price === 'number') return Math.round(price)
  if (!price) return 0
  const digits = String(price).replace(/[^0-9]/g, '')
  const parsed = parseInt(digits, 10)
  return isNaN(parsed) ? 0 : parsed
}

/**
 * Formats a number to Indian Rupee currency format (e.g. 28500 -> "₹28,500").
 */
export function formatPrice(num) {
  const value = Math.max(0, Math.round(num || 0))
  return `₹${value.toLocaleString('en-IN')}`
}

/**
 * Normalizes any product (Saree, Lehenga, or catalog item) into a standardized cart item format.
 */
function normalizeCartItem(product, quantity = 1, variant = '') {
  const numericPrice = parsePrice(product.numericPrice || product.price)

  // Extract main image (handles sarees, lehengas with .images.front, or catalog items)
  let imageSrc = ''
  if (typeof product.image === 'string' && product.image) {
    imageSrc = product.image
  } else if (product.images && typeof product.images === 'object') {
    imageSrc = product.images.front || Object.values(product.images)[0] || ''
  }

  const isLehenga =
    String(product.id || '').toLowerCase().startsWith('lehenga') ||
    String(product.category || '').toLowerCase().includes('lehenga')
  const productType = isLehenga ? 'lehenga' : 'saree'
  const defaultVariant = isLehenga ? 'Full Bridal Ensemble' : 'With Unstitched Blouse'
  const finalVariant = variant || defaultVariant

  return {
    id: `${product.id}-${finalVariant}`,
    productId: String(product.id),
    productType,
    name: product.name || 'AURA Masterpiece',
    price: numericPrice,
    image: imageSrc,
    variant: finalVariant,
    fabric: product.fabric || product.category || 'Pure Silk',
    color: product.color || '',
    quantity: Math.max(1, parseInt(quantity, 10) || 1),
  }
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Load cart data strictly based on authenticated session or isolated guest state
  useEffect(() => {
    let isCancelled = false

    // Wait until auth initialization completes
    if (authLoading) {
      return
    }

    const loadCart = async () => {
      if (!user) {
        // Guest session: load exclusively from guest storage
        try {
          const saved = localStorage.getItem(GUEST_STORAGE_KEY)
          if (!isCancelled) {
            setCart(saved ? JSON.parse(saved) : [])
          }
        } catch {
          if (!isCancelled) setCart([])
        }
        return
      }

      // Authenticated session: Supabase is the sole source of truth
      // Wipe any guest or legacy storage immediately to prevent cross-user contamination
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {}

      setIsSyncing(true)
      try {
        const { data: dbItems, error: fetchError } = await supabase
          .from('cart_items')
          .select('*')
          .eq('user_id', user.id)

        if (fetchError) {
          console.warn('Error fetching cart from Supabase:', fetchError.message)
          if (!isCancelled) {
            setCart([])
            setIsSyncing(false)
          }
          return
        }

        if (isCancelled) return

        const formattedItems = (dbItems || []).map((item) => ({
          id: item.id || `${item.product_id}-${item.variant || ''}`,
          productId: item.product_id,
          productType: item.product_type || 'saree',
          name: item.name,
          price: item.price,
          image: item.image,
          variant: item.variant || '',
          fabric: item.fabric || '',
          color: item.color || '',
          quantity: item.quantity,
        }))

        setCart(formattedItems)
      } catch (err) {
        console.warn('Cart Supabase synchronization error:', err)
        if (!isCancelled) setCart([])
      } finally {
        if (!isCancelled) setIsSyncing(false)
      }
    }

    loadCart()

    // Realtime channel listener for authenticated user's cart changes
    let channel = null
    if (user?.id) {
      channel = supabase
        .channel(`cart-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'cart_items',
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data } = await supabase
              .from('cart_items')
              .select('*')
              .eq('user_id', user.id)

            if (data && !isCancelled) {
              setCart(
                data.map((item) => ({
                  id: item.id || `${item.product_id}-${item.variant || ''}`,
                  productId: item.product_id,
                  productType: item.product_type || 'saree',
                  name: item.name,
                  price: item.price,
                  image: item.image,
                  variant: item.variant || '',
                  fabric: item.fabric || '',
                  color: item.color || '',
                  quantity: item.quantity,
                }))
              )
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
  }, [user, authLoading])

  // Clear state and storage whenever user logs out
  useEffect(() => {
    if (!user) {
      setCart([])
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY)
        localStorage.removeItem(LEGACY_STORAGE_KEY)
      } catch {}
    }
  }, [user])

  /**
   * Add a product to the cart.
   */
  const addToCart = useCallback(
    async (product, quantity = 1, variant = '') => {
      if (!product || !product.id) return

      const normalized = normalizeCartItem(product, quantity, variant)
      let resultingItem = null

      setCart((prev) => {
        const index = prev.findIndex(
          (item) => item.productId === normalized.productId && item.variant === normalized.variant
        )

        let updatedCart = []
        if (index > -1) {
          const existing = prev[index]
          const updated = {
            ...existing,
            quantity: existing.quantity + normalized.quantity,
          }
          resultingItem = updated
          updatedCart = [...prev]
          updatedCart[index] = updated
        } else {
          resultingItem = normalized
          updatedCart = [normalized, ...prev]
        }

        // If guest user, persist to guest storage
        if (!user) {
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedCart))
          } catch {}
        }

        return updatedCart
      })

      // Sync with Supabase if logged in
      if (user && resultingItem) {
        try {
          const { data, error } = await supabase
            .from('cart_items')
            .upsert(
              {
                user_id: user.id,
                product_id: resultingItem.productId,
                product_type: resultingItem.productType,
                name: resultingItem.name,
                price: resultingItem.price,
                image: resultingItem.image,
                variant: resultingItem.variant,
                fabric: resultingItem.fabric,
                color: resultingItem.color,
                quantity: resultingItem.quantity,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id,product_id,variant' }
            )
            .select()
            .single()

          if (data?.id) {
            setCart((prev) =>
              prev.map((item) =>
                item.productId === resultingItem.productId && item.variant === resultingItem.variant
                  ? { ...item, id: data.id }
                  : item
              )
            )
          }
          if (error) {
            console.warn('Error saving added item to Supabase:', error.message)
          }
        } catch (err) {
          console.warn('Error saving added item to Supabase:', err)
        }
      }
    },
    [user]
  )

  /**
   * Remove an item from the cart.
   */
  const removeFromCart = useCallback(
    async (cartItemId) => {
      let removedItem = null

      setCart((prev) => {
        removedItem = prev.find(
          (item) => item.id === cartItemId || `${item.productId}-${item.variant}` === cartItemId
        )
        const updated = prev.filter(
          (item) => item.id !== cartItemId && `${item.productId}-${item.variant}` !== cartItemId
        )

        if (!user) {
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated))
          } catch {}
        }
        return updated
      })

      if (user && removedItem) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            String(removedItem.id)
          )

          if (isUuid) {
            const { error } = await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', user.id)
              .eq('id', removedItem.id)

            if (error) {
              console.warn('Error deleting cart item by id, trying by product_id:', error.message)
              await supabase
                .from('cart_items')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', removedItem.productId)
            }
          } else {
            await supabase
              .from('cart_items')
              .delete()
              .eq('user_id', user.id)
              .eq('product_id', removedItem.productId)
          }
        } catch (err) {
          console.warn('Error removing item from Supabase:', err)
        }
      }
    },
    [user]
  )

  /**
   * Update quantity of an existing item in the cart.
   * If newQuantity <= 0, permanently removes the item.
   */
  const updateQuantity = useCallback(
    async (cartItemId, newQuantity) => {
      const parsedQty = parseInt(newQuantity, 10)
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return removeFromCart(cartItemId)
      }

      const sanitizedQty = Math.max(1, parsedQty)
      let targetItem = null

      setCart((prev) => {
        const updated = prev.map((item) => {
          if (item.id === cartItemId || `${item.productId}-${item.variant}` === cartItemId) {
            targetItem = { ...item, quantity: sanitizedQty }
            return targetItem
          }
          return item
        })

        if (!user) {
          try {
            localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated))
          } catch {}
        }
        return updated
      })

      if (user && targetItem) {
        try {
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            String(targetItem.id)
          )

          let query = supabase
            .from('cart_items')
            .update({
              quantity: sanitizedQty,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

          if (isUuid) {
            query = query.eq('id', targetItem.id)
          } else {
            query = query.eq('product_id', targetItem.productId)
          }

          const { error } = await query
          if (error) {
            console.warn('Error updating item quantity in Supabase:', error.message)
          }
        } catch (err) {
          console.warn('Error updating item quantity in Supabase:', err)
        }
      }
    },
    [user, removeFromCart]
  )

  /**
   * Empty entire cart.
   */
  const clearCart = useCallback(async () => {
    setCart([])
    try {
      localStorage.removeItem(GUEST_STORAGE_KEY)
      localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch {}

    if (user?.id) {
      try {
        await supabase.from('cart_items').delete().eq('user_id', user.id)
      } catch (err) {
        console.warn('Error clearing cart in Supabase:', err)
      }
    }
  }, [user])

  // Computed metrics
  const totalCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.quantity || 1), 0),
    [cart]
  )

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    [cart]
  )

  const openCart = useCallback(() => setIsCartOpen(true), [])
  const closeCart = useCallback(() => setIsCartOpen(false), [])
  const toggleCart = useCallback(() => setIsCartOpen((prev) => !prev), [])

  return (
    <CartContext.Provider
      value={{
        cart,
        totalCount,
        subtotal,
        formattedSubtotal: formatPrice(subtotal),
        isCartOpen,
        isSyncing,
        openCart,
        closeCart,
        toggleCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

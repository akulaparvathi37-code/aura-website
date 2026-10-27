import { supabase } from '../supabase/client'

const LOCAL_STORAGE_KEY = 'aura_local_reviews'

// Helper to get local reviews fallback
function getLocalReviews() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (err) {
    console.warn('Failed to parse local reviews fallback:', err)
    return []
  }
}

// Helper to save local reviews fallback
function saveLocalReviews(reviews) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(reviews))
  } catch (err) {
    console.warn('Failed to persist local reviews fallback:', err)
  }
}

/**
 * Fetch approved & featured reviews for Section 6 display
 */
export async function fetchFeaturedReviews() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('status', 'approved')
      .eq('is_featured', true)
      .order('created_at', { ascending: false })

    if (error) {
      // If table doesn't exist yet or permission denied, fall back to localStorage
      console.info('Supabase reviews table query info:', error.message)
      const local = getLocalReviews()
      return local.filter((r) => r.status === 'approved' && r.is_featured === true)
    }

    if (data && data.length > 0) {
      return data
    }

    // Also check local store if supabase is empty
    const local = getLocalReviews()
    const approvedFeatured = local.filter((r) => r.status === 'approved' && r.is_featured === true)
    return approvedFeatured.length > 0 ? approvedFeatured : []
  } catch (err) {
    console.warn('Error fetching featured reviews:', err)
    const local = getLocalReviews()
    return local.filter((r) => r.status === 'approved' && r.is_featured === true)
  }
}

/**
 * Patrons submit a review from Section 6 CTA or Checkout confirmation
 */
export async function submitCustomerReview({
  userId = null,
  customerName,
  customerEmail = '',
  avatarUrl = '',
  productId = '',
  productName,
  rating,
  comment,
  isVerifiedPurchase = false,
}) {
  const cleanProductId =
    productId && productId !== 'general' && productId !== 'seed' && productId.trim() !== ''
      ? productId.trim()
      : null

  const validUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : undefined

  const newReview = {
    id: validUuid,
    user_id: userId || null,
    customer_name: customerName?.trim() || 'Anonymous Patron',
    customer_email: customerEmail?.trim() || '',
    avatar_url: avatarUrl || '',
    product_id: cleanProductId,
    product_name: productName?.trim() || 'AURA Couture Ensemble',
    rating: Math.max(1, Math.min(5, Number(rating) || 5)),
    comment: comment?.trim() || '',
    is_verified_purchase: Boolean(isVerifiedPurchase),
    status: 'pending', // Moderation required
    is_featured: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 1. Always write to local storage as immediate safe copy
  const localList = getLocalReviews()
  saveLocalReviews([newReview, ...localList])

  // 2. Attempt insert to Supabase
  try {
    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          id: newReview.id,
          user_id: newReview.user_id,
          customer_name: newReview.customer_name,
          customer_email: newReview.customer_email,
          avatar_url: newReview.avatar_url,
          product_id: newReview.product_id,
          product_name: newReview.product_name,
          rating: newReview.rating,
          comment: newReview.comment,
          is_verified_purchase: newReview.is_verified_purchase,
          status: newReview.status,
          is_featured: newReview.is_featured,
        },
      ])
      .select()
      .single()

    if (error) {
      console.warn('Supabase insert note (fallback cached locally):', error.message)
      return { success: true, data: newReview, source: 'local' }
    }

    return { success: true, data: data || newReview, source: 'supabase' }
  } catch (err) {
    console.warn('Network/Supabase error submitting review, saved locally:', err)
    return { success: true, data: newReview, source: 'local' }
  }
}

/**
 * Admin: Fetch all reviews for moderation (pending, approved, rejected)
 */
export async function fetchAdminReviews() {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.info('Supabase admin reviews query info:', error.message)
      return getLocalReviews()
    }

    // Merge supabase data with any unique local records
    const local = getLocalReviews()
    const map = new Map()
    ;(data || []).forEach((r) => map.set(r.id, r))
    local.forEach((r) => {
      if (!map.has(r.id)) map.set(r.id, r)
    })

    return Array.from(map.values())
  } catch (err) {
    console.warn('Error fetching admin reviews:', err)
    return getLocalReviews()
  }
}

/**
 * Admin: Update review status ('pending' | 'approved' | 'rejected')
 */
export async function updateReviewStatus(id, newStatus) {
  // Update local
  const local = getLocalReviews().map((r) =>
    r.id === id ? { ...r, status: newStatus, updated_at: new Date().toISOString() } : r
  )
  saveLocalReviews(local)

  try {
    const { error } = await supabase
      .from('reviews')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) console.warn('Supabase update status note:', error.message)
    return { success: true }
  } catch (err) {
    console.warn('Error updating review status in Supabase:', err)
    return { success: true }
  }
}

/**
 * Admin: Toggle is_featured boolean for display in Section 6
 */
export async function toggleReviewFeatured(id, isFeatured) {
  // Update local
  const local = getLocalReviews().map((r) =>
    r.id === id ? { ...r, is_featured: isFeatured, updated_at: new Date().toISOString() } : r
  )
  saveLocalReviews(local)

  try {
    const { error } = await supabase
      .from('reviews')
      .update({ is_featured: isFeatured, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) console.warn('Supabase toggle featured note:', error.message)
    return { success: true }
  } catch (err) {
    console.warn('Error toggling featured review in Supabase:', err)
    return { success: true }
  }
}

/**
 * Admin: Delete review
 */
export async function deleteReview(id) {
  // Delete from local
  const local = getLocalReviews().filter((r) => r.id !== id)
  saveLocalReviews(local)

  try {
    const { error } = await supabase.from('reviews').delete().eq('id', id)
    if (error) console.warn('Supabase delete review note:', error.message)
    return { success: true }
  } catch (err) {
    console.warn('Error deleting review in Supabase:', err)
    return { success: true }
  }
}

/**
 * Subscribe to realtime changes on reviews table
 */
export function subscribeToReviews(onUpdate) {
  try {
    const channel = supabase
      .channel('public:reviews_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reviews' },
        (payload) => {
          onUpdate?.(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  } catch (err) {
    console.warn('Could not establish realtime channel for reviews:', err)
    return () => {}
  }
}

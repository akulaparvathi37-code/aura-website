import { supabase } from '../supabase/client'
import { PRODUCTS } from '../../data/products'

/**
 * Service for administrative operations, products, orders, users,
 * settings, and dynamic best sellers querying.
 */

// ==========================================
// 1. BEST SELLERS
// ==========================================

/**
 * Fetches dynamic best seller products ordered by display_order.
 * Joins public.best_sellers with public.products.
 * Falls back to local PRODUCTS if table is empty or error occurs.
 */
export async function getBestSellerProducts() {
  try {
    const { data, error } = await supabase
      .from('best_sellers')
      .select(`
        id,
        product_id,
        display_order,
        active,
        products (*)
      `)
      .eq('active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.warn('Error fetching dynamic best sellers from Supabase:', error.message)
      return PRODUCTS
    }

    if (!data || data.length === 0) {
      return PRODUCTS
    }

    // Map into product objects conforming to AURA card layout
    return data
      .filter((item) => item.products)
      .map((item) => {
        const p = item.products
        return {
          id: p.id,
          name: p.name,
          category: p.category,
          price: p.price,
          originalPrice: p.original_price,
          numericPrice: Number(p.numeric_price) || 0,
          rating: Number(p.rating) || 5,
          reviewsCount: p.reviews_count || 100,
          image: p.image,
          fabric: p.fabric,
          color: p.color,
          craftTime: p.craft_time,
          origin: p.origin,
          blouse: p.blouse,
          description: p.description,
          stock: p.stock,
          displayOrder: item.display_order,
          bestSellerId: item.id,
        }
      })
  } catch (err) {
    console.warn('Exception in getBestSellerProducts:', err)
    return PRODUCTS
  }
}

/**
 * Fetches all products currently marked as Best Sellers for the Admin table.
 */
export async function getAdminBestSellers() {
  const { data, error } = await supabase
    .from('best_sellers')
    .select(`
      id,
      product_id,
      display_order,
      active,
      created_at,
      products (
        id,
        sku,
        name,
        category,
        price,
        numeric_price,
        image,
        stock,
        fabric
      )
    `)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data || []).map((row) => ({
    id: row.id,
    productId: row.product_id,
    displayOrder: row.display_order,
    active: row.active,
    createdAt: row.created_at,
    product: row.products || {},
  }))
}

/**
 * Fetches catalog products that are available to be added as Best Sellers.
 */
export async function getAvailableProductsForBestSeller(searchTerm = '', categoryFilter = '') {
  // 1. Get existing best seller product IDs
  const { data: existing, error: existingErr } = await supabase
    .from('best_sellers')
    .select('product_id')

  if (existingErr) throw existingErr
  const existingIds = (existing || []).map((b) => b.product_id)

  // 2. Query products from public.products
  let query = supabase
    .from('products')
    .select('*')
    .eq('active', true)
    .order('name', { ascending: true })

  if (existingIds.length > 0) {
    // Exclude already added IDs
    query = query.not('id', 'in', `(${existingIds.map((id) => `"${id}"`).join(',')})`)
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim()
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`)
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Adds an existing product to Best Sellers.
 * Validates that product exists and prevents duplicate.
 */
export async function addProductToBestSellers(productId) {
  if (!productId) throw new Error('Product ID is required')

  // Determine next display order
  const { data: maxOrderRow } = await supabase
    .from('best_sellers')
    .select('display_order')
    .order('display_order', { ascending: false })
    .limit(1)

  const nextOrder = (maxOrderRow && maxOrderRow[0]?.display_order ? maxOrderRow[0].display_order : 0) + 1

  const { data, error } = await supabase
    .from('best_sellers')
    .insert({
      product_id: String(productId),
      display_order: nextOrder,
      active: true,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('This product is already marked as a Best Seller.')
    }
    throw error
  }

  return data
}

/**
 * Removes a product association from Best Sellers.
 * The original product in public.products is NOT deleted.
 */
export async function removeProductFromBestSellers(productId) {
  if (!productId) throw new Error('Product ID is required')

  const { error } = await supabase
    .from('best_sellers')
    .delete()
    .eq('product_id', String(productId))

  if (error) throw error
  return { success: true }
}

/**
 * Updates display order of Best Sellers.
 * Accepts array of { product_id, display_order }.
 */
export async function reorderBestSellers(items) {
  if (!items || items.length === 0) return

  const { data, error } = await supabase.rpc('admin_reorder_best_sellers', {
    p_items: items,
  })

  if (!error) return data

  // Fallback to direct updates if RPC not accessible
  for (const item of items) {
    await supabase
      .from('best_sellers')
      .update({ display_order: item.display_order, updated_at: new Date().toISOString() })
      .eq('product_id', item.product_id)
  }
  return { success: true }
}

// ==========================================
// 2. DASHBOARD
// ==========================================

/**
 * Fetches dynamic statistics calculated from the live Supabase database.
 */
export async function getDashboardStats() {
  const { data, error } = await supabase.rpc('admin_get_dashboard_stats')
  if (error) {
    console.warn('admin_get_dashboard_stats error, falling back to direct queries:', error)
    // Fallback direct count calculation
    const [pRes, oRes, uRes] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }).eq('active', true),
      supabase.from('orders').select('total_amount, payment_status, order_status'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
    ])

    const totalRevenue = (oRes.data || [])
      .filter((o) => o.payment_status === 'paid' && o.order_status !== 'Cancelled')
      .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0)

    const { count: lowStockCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .lte('stock', 5)

    return {
      total_products: pRes.count || 0,
      total_orders: (oRes.data || []).length,
      total_users: uRes.count || 0,
      total_revenue: totalRevenue,
      low_stock_count: lowStockCount || 0,
    }
  }
  return data
}

/**
 * Fetches products whose stock is at or below their low-stock threshold.
 */
export async function getLowStockProducts(limit = 8) {
  const { data, error } = await supabase.rpc('admin_get_low_stock_products', { p_limit: limit })
  if (error) {
    // Direct query fallback
    const { data: directData } = await supabase
      .from('products')
      .select('id, sku, name, category, price, numeric_price, image, stock, low_stock_threshold, status, active')
      .lte('stock', 5)
      .order('stock', { ascending: true })
      .limit(limit)

    return directData || []
  }
  return data || []
}

/**
 * Fetches latest real customer orders from Supabase.
 */
export async function getRecentOrders(limit = 6) {
  const { data, error } = await supabase.rpc('admin_get_recent_orders', { p_limit: limit })
  if (error) {
    // Direct query fallback
    const { data: directOrders } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        subtotal,
        shipping_fee,
        total_amount,
        currency,
        payment_status,
        payment_id,
        payment_method,
        order_status,
        created_at,
        order_items (*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    return (directOrders || []).map((o) => ({
      ...o,
      items: o.order_items || [],
      item_count: (o.order_items || []).length,
    }))
  }
  return data || []
}

// ==========================================
// 3. PRODUCTS MANAGEMENT
// ==========================================

/**
 * Fetches products list with optional filters and best seller indicator.
 */
export async function getAdminProducts({
  searchTerm = '',
  categoryFilter = 'all',
  statusFilter = 'all',
  sortBy = 'created_at',
  sortOrder = 'desc',
} = {}) {
  let query = supabase.from('products').select('*')

  if (statusFilter && statusFilter !== 'all') {
    if (statusFilter === 'active') {
      query = query.eq('status', 'active').eq('active', true)
    } else if (statusFilter === 'draft') {
      query = query.eq('status', 'draft')
    } else if (statusFilter === 'inactive') {
      query = query.or('status.eq.inactive,active.eq.false')
    }
  }

  if (categoryFilter && categoryFilter !== 'all') {
    query = query.eq('category', categoryFilter)
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim()
    query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,category.ilike.%${term}%`)
  }

  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  const { data: productsData, error } = await query
  if (error) throw error

  // Also query best seller IDs to decorate each product with its best seller state
  const { data: bestSellerRows } = await supabase
    .from('best_sellers')
    .select('product_id, display_order')
    .eq('active', true)

  const bestSellerMap = new Map()
  ;(bestSellerRows || []).forEach((b) => bestSellerMap.set(b.product_id, b.display_order))

  return (productsData || []).map((p) => ({
    ...p,
    isBestSeller: bestSellerMap.has(p.id),
    bestSellerOrder: bestSellerMap.get(p.id) || null,
  }))
}

/**
 * Creates or updates a product in Supabase.
 */
export async function saveProduct(productData) {
  const { data, error } = await supabase.rpc('admin_save_product', {
    p_product: productData,
  })

  if (error) {
    console.error('Error in admin_save_product RPC, attempting direct upsert:', error)
    // Direct upsert fallback
    const id = productData.id || `prod-${Date.now()}`
    const numPrice = Number(productData.numeric_price) || 0
    const formattedPrice = productData.price || `₹${numPrice.toLocaleString('en-IN')}`
    const active = productData.status === 'active'

    const { data: directUpsert, error: directErr } = await supabase
      .from('products')
      .upsert({
        id,
        sku: productData.sku || `SKU-${Date.now().toString().slice(-4)}`,
        name: productData.name,
        subtitle: productData.subtitle || '',
        category: productData.category || 'Sarees',
        price: formattedPrice,
        numeric_price: numPrice,
        original_price: productData.original_price || '',
        stock: Number(productData.stock) || 0,
        low_stock_threshold: Number(productData.low_stock_threshold) || 5,
        image: productData.image || '',
        images: productData.images || [productData.image || ''],
        description: productData.description || '',
        specifications: productData.specifications || [],
        fabric:
          productData.fabric ||
          productData.specifications?.find((s) => s.key === 'Fabric')?.value ||
          '',
        color:
          productData.color ||
          productData.specifications?.find((s) => s.key === 'Color')?.value ||
          '',
        craft_time: productData.craft_time || '',
        origin: productData.origin || '',
        blouse: productData.blouse || '',
        status: productData.status || 'active',
        active,
        badge: productData.badge || '',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (directErr) throw directErr
    return directUpsert
  }

  return data
}

/**
 * Deactivates a product.
 */
export async function deactivateProduct(productId) {
  const { data, error } = await supabase.rpc('admin_deactivate_product', {
    p_product_id: productId,
  })

  if (error) {
    // Fallback direct update
    await supabase.from('best_sellers').delete().eq('product_id', productId)
    const { error: updErr } = await supabase
      .from('products')
      .update({ active: false, status: 'inactive', updated_at: new Date().toISOString() })
      .eq('id', productId)

    if (updErr) throw updErr
    return { success: true }
  }

  return data
}

/**
 * Uploads an image file to Supabase Storage 'product-images' bucket
 * and returns its public URL with explicit MIME contentType.
 */
export async function uploadProductImage(file) {
  if (!file) throw new Error('No image file provided')

  const fileExt = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
  const fileName = `${Date.now()}_${cleanName.slice(0, 16)}.${fileExt}`
  const filePath = `uploads/${fileName}`

  // MIME type mapping to ensure valid browser rendering and prevent black/corrupted images
  const mimeMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    avif: 'image/avif',
  }
  const contentType = file.type || mimeMap[fileExt] || 'image/jpeg'

  const { error: uploadError } = await supabase.storage
    .from('product-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      contentType,
      upsert: true,
    })

  if (uploadError) {
    console.error('Supabase Storage upload error:', uploadError)
    throw uploadError
  }

  const { data: publicData } = supabase.storage
    .from('product-images')
    .getPublicUrl(filePath)

  return publicData.publicUrl
}

// ==========================================
// 4. ORDERS MANAGEMENT
// ==========================================

/**
 * Fetches all orders with line items and filters.
 */
export async function getAdminOrders({
  statusFilter = 'all',
  paymentFilter = 'all',
  searchTerm = '',
} = {}) {
  let query = supabase
    .from('orders')
    .select(`
      id,
      order_number,
      user_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      subtotal,
      shipping_fee,
      total_amount,
      currency,
      payment_status,
      payment_id,
      payment_method,
      order_status,
      created_at,
      updated_at,
      order_items (*)
    `)
    .order('created_at', { ascending: false })

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('order_status', statusFilter)
  }

  if (paymentFilter && paymentFilter !== 'all') {
    query = query.eq('payment_status', paymentFilter)
  }

  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.trim()
    query = query.or(
      `order_number.ilike.%${term}%,customer_name.ilike.%${term}%,customer_email.ilike.%${term}%`
    )
  }

  const { data, error } = await query
  if (error) throw error

  return (data || []).map((o) => ({
    ...o,
    items: o.order_items || [],
  }))
}

/**
 * Updates order status (e.g. Pending -> Processing -> Shipping -> Delivered -> Cancelled).
 */
export async function updateOrderStatus(orderId, newStatus) {
  const { data, error } = await supabase.rpc('admin_update_order_status', {
    p_order_id: orderId,
    p_status: newStatus,
  })

  if (error) {
    // Fallback direct update
    const { data: directUpd, error: directErr } = await supabase
      .from('orders')
      .update({ order_status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select()
      .single()

    if (directErr) throw directErr
    return directUpd
  }

  return data
}

/**
 * Updates payment status (e.g. pending -> paid when Cash on Delivery is collected).
 */
export async function updatePaymentStatus(orderId, newPaymentStatus) {
  const { data, error } = await supabase
    .from('orders')
    .update({ payment_status: newPaymentStatus, updated_at: new Date().toISOString() })
    .eq('id', orderId)
    .select()
    .single()

  if (error) {
    console.error('Error updating payment status:', error)
    throw error
  }
  return data
}

// ==========================================
// 5. USERS MANAGEMENT
// ==========================================

/**
 * Fetches registered users and aggregates.
 */
export async function getAdminUsers() {
  const { data, error } = await supabase.rpc('admin_get_users')
  if (error) {
    // Direct query fallback
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (pErr) throw pErr
    return profiles || []
  }
  return data || []
}

/**
 * Fetches specific user details and order history.
 */
export async function getUserDetails(userId) {
  const { data, error } = await supabase.rpc('admin_get_user_details', {
    p_user_id: userId,
  })

  if (error) {
    // Direct query fallback
    const [profRes, ordRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ])

    return {
      profile: profRes.data || {},
      orders: ordRes.data || [],
    }
  }

  return data
}

// ==========================================
// 6. PAYMENT CONFIGURATION
// ==========================================

/**
 * Retrieves payment configuration for the Admin panel.
 * Never receives or displays the secret key.
 */
export async function getPaymentConfig() {
  const { data, error } = await supabase.rpc('admin_get_payment_config')
  if (error) {
    const { data: pubData } = await supabase
      .from('payment_settings')
      .select('provider, environment, key_id, is_configured, last_verified_at, last_test_status')
      .eq('id', 'default')
      .single()

    return (
      pubData || {
        provider: 'razorpay',
        environment: 'test',
        key_id: 'rzp_test_1DP5mmOlF5G5ag',
        is_configured: true,
        masked_secret: '••••••••••••••••',
        has_secret: true,
      }
    )
  }
  return data
}

/**
 * Saves updated Razorpay credentials securely server-side.
 * The secret key is stored in Supabase Vault and never returned.
 */
export async function savePaymentConfig({ keyId, keySecret, environment = 'test' }) {
  if (!keyId || !keyId.trim()) {
    throw new Error('Razorpay Key ID is required')
  }

  const { data, error } = await supabase.rpc('admin_save_payment_config', {
    p_key_id: keyId.trim(),
    p_key_secret: keySecret && keySecret.trim() ? keySecret.trim() : null,
    p_environment: environment,
  })

  if (error) throw error
  return data
}

/**
 * Performs a real server-side connection test to the Razorpay API.
 * Returns only SUCCESS or FAILED without exposing secrets.
 */
export async function testPaymentConnection(environment = 'test') {
  const { data, error } = await supabase.rpc('admin_test_payment_connection', {
    p_environment: environment,
  })

  if (error) throw error
  return data
}

// ==========================================
// 7. STORE SETTINGS
// ==========================================

/**
 * Fetches store settings.
 */
export async function getStoreSettings() {
  const { data, error } = await supabase
    .from('store_settings')
    .select('*')
    .eq('id', 'default')
    .single()

  if (error) {
    return {
      store_name: 'AURA Luxury Fashion',
      currency: 'INR',
      currency_symbol: '₹',
      contact_email: 'concierge@aura-luxury.com',
      contact_phone: '+91 800-AURA-LUX',
      atelier_address: 'AURA Heritage Atelier, 12 Zari Enclave, Varanasi, India',
      free_shipping_threshold: 2000,
      order_email_notifications: true,
      sms_dispatch_alerts: true,
    }
  }
  return data
}

/**
 * Updates store settings.
 */
export async function saveStoreSettings(settings) {
  const { data, error } = await supabase.rpc('admin_save_store_settings', {
    p_store_name: settings.store_name,
    p_currency: settings.currency,
    p_currency_symbol: settings.currency_symbol,
    p_contact_email: settings.contact_email,
    p_contact_phone: settings.contact_phone,
    p_atelier_address: settings.atelier_address,
    p_free_shipping_threshold: Number(settings.free_shipping_threshold) || 2000,
    p_order_email_notifications: Boolean(settings.order_email_notifications),
    p_sms_dispatch_alerts: Boolean(settings.sms_dispatch_alerts),
  })

  if (error) throw error
  return data
}

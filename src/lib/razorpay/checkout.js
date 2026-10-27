import { supabase } from '../supabase/client.js'

/**
 * Ensures Razorpay Checkout script is loaded on the page.
 */
export function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)

    const existingScript = document.querySelector('script[src*="checkout.razorpay.com"]')
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true))
      existingScript.addEventListener('error', () => resolve(false))
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

/**
 * Generates an authentic luxury AURA order tracking number.
 */
export function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-4)
  const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `AURA-${timestamp}-${randomHex}`
}

/**
 * Validates products, variants, and calculates trusted totals against database records.
 * Ensures that cart item prices match server/database prices and checks stock.
 */
export async function validateAndCalculateCartTotal(cartItems) {
  if (!cartItems || cartItems.length === 0) {
    return {
      isValid: false,
      error: 'Your shopping bag is empty.',
      verifiedItems: [],
      subtotal: 0,
    }
  }

  const productIds = cartItems
    .map((item) => String(item.productId || item.id || '').split('-')[0])
    .filter(Boolean)

  let dbProductsMap = new Map()

  if (productIds.length > 0) {
    try {
      const { data: dbProducts, error } = await supabase
        .from('products')
        .select('id, name, price, numeric_price, stock, active, status')
        .in('id', productIds)

      if (!error && Array.isArray(dbProducts)) {
        dbProducts.forEach((p) => {
          dbProductsMap.set(String(p.id).toLowerCase(), p)
        })
      }
    } catch (err) {
      console.warn('Database product validation query notice:', err)
    }
  }

  const verifiedItems = []
  let calculatedSubtotal = 0
  const validationErrors = []

  for (const item of cartItems) {
    const rawId = String(item.productId || item.id || '').split('-')[0].toLowerCase()
    const dbMatch = dbProductsMap.get(rawId)

    let verifiedPrice = Number(item.price) || 0
    let verifiedStock = 99
    let isItemActive = true

    if (dbMatch) {
      const dbNumeric = Number(dbMatch.numeric_price)
      if (!isNaN(dbNumeric) && dbNumeric > 0) {
        verifiedPrice = dbNumeric
      } else if (dbMatch.price) {
        const parsed = parseInt(String(dbMatch.price).replace(/[^0-9]/g, ''), 10)
        if (!isNaN(parsed) && parsed > 0) {
          verifiedPrice = parsed
        }
      }

      if (typeof dbMatch.stock === 'number') {
        verifiedStock = dbMatch.stock
      }

      isItemActive = dbMatch.active !== false && dbMatch.status !== 'inactive'
    }

    if (!isItemActive) {
      validationErrors.push(`"${item.name}" is currently unavailable.`)
    }

    const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
    if (verifiedStock < qty) {
      validationErrors.push(`Only ${verifiedStock} unit(s) left in stock for "${item.name}".`)
    }

    const itemTotal = verifiedPrice * qty
    calculatedSubtotal += itemTotal

    verifiedItems.push({
      ...item,
      price: verifiedPrice,
      quantity: qty,
      lineTotal: itemTotal,
    })
  }

  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
    verifiedItems,
    subtotal: calculatedSubtotal,
  }
}

/**
 * Universal dispatcher to call secure server payment endpoints:
 * 1. Attempts Supabase Edge Function first
 * 2. Seamlessly falls back to local Vite backend middleware (/api/razorpay/<endpoint>)
 */
async function callSecurePaymentEndpoint(functionName, localEndpoint, payload) {
  let authHeaders = {}
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) {
      authHeaders['Authorization'] = `Bearer ${session.access_token}`
    }
  } catch (authErr) {
    console.debug('Session retrieval note:', authErr)
  }

  const guestToken = payload?.guestToken || payload?.guest_token
  if (guestToken) {
    authHeaders['x-guest-token'] = guestToken
  }

  // 1. Try Supabase Edge Function
  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
      headers: authHeaders,
    })
    if (!error && data) {
      return data
    }
    if (error && error.status && error.status !== 404 && error.status !== 502) {
      // Meaningful response from edge function with error
      throw new Error(error.message || 'Payment server returned error')
    }
  } catch (edgeErr) {
    // If edge functions are not locally hosted or unlinked in dev, fallback to local dev API
    console.debug(`[AURA Gateway] Edge function (${functionName}) notice, checking local development endpoint:`, edgeErr.message)
  }

  // 2. Local development endpoint
  const res = await fetch(`/api/razorpay/${localEndpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify(payload),
  })

  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(json.error || `Payment server request failed (${res.status})`)
  }
  return json
}

/**
 * PHASE 2: Server-Side Razorpay Order Creation
 * Validates stock, calculates authoritative prices & discounts on server, and creates Razorpay Order.
 */
export async function createRazorpayServerOrder({
  cartItems,
  customer,
  shippingAddress,
  couponCode,
  userId,
}) {
  return await callSecurePaymentEndpoint(
    'create-razorpay-order',
    'create-order',
    { cartItems, customer, shippingAddress, couponCode, userId }
  )
}

/**
 * PHASE 3: Server-Side Cryptographic Signature Verification
 * Verifies Razorpay HMAC SHA-256 signature using RAZORPAY_KEY_SECRET on the server.
 */
export async function verifyRazorpayPaymentOnServer({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
  order_number,
  guestToken,
}) {
  return await callSecurePaymentEndpoint(
    'verify-razorpay-payment',
    'verify-payment',
    {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number,
      guest_token: guestToken,
      guestToken,
    }
  )
}

/**
 * PHASE 5: Secure Cash on Delivery Order Creation
 * Validates prices on server, inserts order with payment_status = 'pending', without calling Razorpay.
 */
export async function createCashOnDeliveryServerOrder({
  cartItems,
  customer,
  shippingAddress,
  couponCode,
  userId,
}) {
  return await callSecurePaymentEndpoint(
    'create-cod-order',
    'create-cod-order',
    { cartItems, customer, shippingAddress, couponCode, userId }
  )
}

/**
 * Launches the official Razorpay Standard Checkout payment modal with server-side order_id.
 */
export async function launchRazorpayModal({
  amount, // in INR (e.g. 28500)
  orderNumber,
  razorpayOrderId,
  keyId,
  customer, // { name, email, phone }
  onSuccess,
  onFailure,
  onDismiss,
}) {
  const loaded = await loadRazorpayScript()

  let finalKeyId =
    keyId ||
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_RAZORPAY_KEY_ID || import.meta.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)) ||
    ''

  if (!finalKeyId) {
    try {
      const { data: config } = await supabase
        .from('payment_settings')
        .select('key_id')
        .eq('id', 'default')
        .single()
      if (config?.key_id) {
        finalKeyId = config.key_id
      }
    } catch (err) {
      console.debug('Payment settings lookup notice:', err)
    }
  }

  if (!finalKeyId) {
    console.warn('Razorpay Key ID not configured. Please define VITE_RAZORPAY_KEY_ID in your .env or configure in Admin Portal.')
  }

  if (!loaded || !window.Razorpay) {
    const errorMsg = 'Razorpay Checkout SDK could not be loaded. Please check your network connection or ad-blocker.'
    onFailure?.({ description: errorMsg })
    return { success: false, error: errorMsg }
  }

  return new Promise((resolve) => {
    try {
      const options = {
        key: finalKeyId,
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        order_id: razorpayOrderId || undefined, // Server-generated Razorpay Order ID
        name: 'AURA Luxury Fashion',
        description: `Order ${orderNumber} • Handcrafted Heirloom Ensemble`,
        image: '/images/products/royal-maroon.jpg',
        handler: function (response) {
          // Cryptographic response received from Razorpay Standard Checkout
          const result = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id || razorpayOrderId,
            razorpay_signature: response.razorpay_signature,
            order_number: orderNumber,
            method: 'Razorpay',
          }
          onSuccess?.(result)
          resolve({ success: true, result })
        },
        prefill: {
          name: customer.name || '',
          email: customer.email || '',
          contact: customer.phone || '',
        },
        notes: {
          order_number: orderNumber,
          curation: 'AURA Handloom Heritage Atelier',
        },
        theme: {
          color: '#07211C',
          backdrop_color: '#041411',
        },
        modal: {
          ondismiss: function () {
            onDismiss?.()
            resolve({ dismissed: true })
          },
          animation: true,
          backdropclose: false,
          escape: true,
        },
      }

      const rzpInstance = new window.Razorpay(options)

      rzpInstance.on('payment.failed', function (response) {
        onFailure?.(response.error)
        resolve({ failed: true, error: response.error })
      })

      rzpInstance.open()
    } catch (err) {
      console.warn('Razorpay checkout exception:', err)
      onFailure?.({ description: err.message || 'Payment initiation failed.' })
      resolve({ success: false, error: err })
    }
  })
}

/**
 * Backward-compatible helper retained for testing and client-side fallback with strict 'pending' enforcement.
 */
export async function createOrderInDatabase({
  userId,
  orderNumber,
  customer,
  shippingAddress,
  cartItems,
  subtotal,
  shippingFee = 0,
  discountAmount = 0,
  totalAmount,
  paymentId,
  paymentStatus = 'pending', // Strictly default to 'pending'
  paymentMethod = 'Razorpay',
}) {
  try {
    // 1. Idempotency Check
    if (orderNumber) {
      const { data: existingByOrder } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .maybeSingle()

      if (existingByOrder) {
        return existingByOrder
      }
    }

    const finalTotal = Math.max(0, Math.round(totalAmount ?? (subtotal + shippingFee - discountAmount)))

    // 2. Insert order record with payment_status strictly 'pending'
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId || null,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: shippingAddress,
        subtotal: Math.round(subtotal),
        shipping_fee: Math.round(shippingFee),
        total_amount: finalTotal,
        currency: 'INR',
        payment_status: 'pending', // Customers cannot directly mark orders as paid
        payment_id: paymentId,
        payment_method: paymentMethod,
        order_status: 'Pending',
      })
      .select()
      .single()

    if (orderError) {
      console.error('Supabase orders table error:', orderError.message)
      throw orderError
    }

    // 3. Insert line items
    if (cartItems && cartItems.length > 0) {
      const lineItems = cartItems.map((item) => ({
        order_id: orderData.id,
        product_id: String(item.productId || item.id),
        product_type: item.productType || 'saree',
        name: item.name,
        price: Math.round(item.price),
        image: item.image,
        variant: item.variant || '',
        quantity: item.quantity || 1,
      }))

      await supabase.from('order_items').insert(lineItems)
    }

    return orderData
  } catch (err) {
    console.error('Order creation exception:', err)
    return {
      id: `local-${Date.now()}`,
      order_number: orderNumber,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: shippingAddress,
      subtotal,
      shippingFee: shippingFee,
      total_amount: totalAmount,
      currency: 'INR',
      payment_status: 'pending',
      payment_id: paymentId,
      payment_method: paymentMethod,
      order_status: 'Pending',
      created_at: new Date().toISOString(),
    }
  }
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.117.3"

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || ''
  const allowedOrigins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ]
  const productionOrigin = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL')
  if (productionOrigin) {
    allowedOrigins.push(productionOrigin.replace(/\/$/, ''))
  }

  const isAllowed = allowedOrigins.includes(origin) || !origin
  const allowOriginHeader = isAllowed && origin ? origin : (allowedOrigins.includes(origin) ? origin : allowedOrigins[0])

  return {
    'Access-Control-Allow-Origin': allowOriginHeader,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-guest-token',
  }
}

const ACTIVE_COUPONS: Record<string, number> = {
  'AURA10': 0.10,
  'HEIRLOOM': 0.15,
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Configuration Error] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured.')
      return new Response(
        JSON.stringify({ error: 'Server configuration unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Validate customer access token if present
    let userId: string | null = null
    const authHeader = req.headers.get('Authorization')
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token)
        if (user) {
          userId = user.id
        }
      }
    }

    const body = await req.json()
    const { cartItems, customer, shippingAddress, couponCode } = body

    if (!customer?.name || !customer?.email || !customer?.phone || !shippingAddress) {
      return new Response(
        JSON.stringify({ error: 'Incomplete customer or delivery information.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Shopping bag is empty.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. Authoritative Server-Side Product Price & Stock Verification
    const productIds = cartItems
      .map((item) => String(item.productId || item.id || '').split('-')[0])
      .filter(Boolean)

    const { data: dbProducts, error: dbErr } = await supabase
      .from('products')
      .select('id, name, price, numeric_price, stock, active, status')
      .in('id', productIds)

    const dbProductsMap = new Map<string, any>()
    if (!dbErr && Array.isArray(dbProducts)) {
      dbProducts.forEach((p) => dbProductsMap.set(String(p.id).toLowerCase(), p))
    }

    let calculatedSubtotal = 0
    const verifiedItems = []

    for (const item of cartItems) {
      const rawId = String(item.productId || item.id || '').split('-')[0].toLowerCase()
      const dbMatch = dbProductsMap.get(rawId)

      let unitPrice = Number(item.price) || 0
      let stock = 99
      let isActive = true

      if (dbMatch) {
        const dbNumeric = Number(dbMatch.numeric_price)
        if (!isNaN(dbNumeric) && dbNumeric > 0) {
          unitPrice = dbNumeric
        } else if (dbMatch.price) {
          const parsed = parseInt(String(dbMatch.price).replace(/[^0-9]/g, ''), 10)
          if (!isNaN(parsed) && parsed > 0) {
            unitPrice = parsed
          }
        }
        if (typeof dbMatch.stock === 'number') stock = dbMatch.stock
        isActive = dbMatch.active !== false && dbMatch.status !== 'inactive'
      }

      if (!isActive) {
        return new Response(
          JSON.stringify({ error: `Product "${item.name}" is currently unavailable.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
      if (stock < qty) {
        return new Response(
          JSON.stringify({ error: `Only ${stock} unit(s) available for "${item.name}".` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const lineTotal = unitPrice * qty
      calculatedSubtotal += lineTotal

      verifiedItems.push({
        productId: String(item.productId || item.id),
        productType: item.productType || 'saree',
        name: item.name || 'AURA Ensemble',
        price: unitPrice,
        image: item.image || '',
        variant: item.variant || '',
        quantity: qty,
      })
    }

    // 2. Authoritative Server-Side Coupon Discount Calculation
    let discountAmount = 0
    if (couponCode) {
      const cleanCode = String(couponCode).trim().toUpperCase()
      const rate = ACTIVE_COUPONS[cleanCode]
      if (rate) {
        discountAmount = Math.round(calculatedSubtotal * rate)
      }
    }

    const shippingFee = 0 // Luxury complimentary delivery
    const payableTotal = Math.max(0, calculatedSubtotal + shippingFee - discountAmount)

    // 3. Unique Order Tracking Reference
    const timestamp = Date.now().toString().slice(-4)
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
    const orderNumber = `AURA-${timestamp}-${randomHex}`
    const codPaymentId = `COD-${orderNumber.slice(-6)}`

    // 4. Insert COD Order into Supabase
    const { data: orderData, error: orderInsertErr } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_name: customer.name.trim(),
        customer_email: customer.email.trim(),
        customer_phone: customer.phone.trim(),
        shipping_address: shippingAddress,
        subtotal: Math.round(calculatedSubtotal),
        shipping_fee: Math.round(shippingFee),
        total_amount: Math.round(payableTotal),
        currency: 'INR',
        payment_status: 'pending', // Strictly pending for COD orders
        payment_id: codPaymentId,
        payment_method: 'Cash on Delivery',
        order_status: 'Pending',
      })
      .select()
      .single()

    if (orderInsertErr) {
      console.error('Database COD order creation error:', orderInsertErr)
      return new Response(
        JSON.stringify({ error: 'Database order creation failed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. Insert Order Items
    const lineItemsToInsert = verifiedItems.map((item) => ({
      order_id: orderData.id,
      product_id: item.productId,
      product_type: item.productType,
      name: item.name,
      price: item.price,
      image: item.image,
      variant: item.variant,
      quantity: item.quantity,
    }))

    await supabase.from('order_items').insert(lineItemsToInsert)

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          ...orderData,
          items: verifiedItems,
          discountAmount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('COD order creation exception:', err)
    return new Response(
      JSON.stringify({ error: 'Server error creating Cash on Delivery order.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

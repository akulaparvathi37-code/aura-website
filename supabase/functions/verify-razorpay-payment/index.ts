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

// Constant-time string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return result === 0
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed.' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') || ''

    // 1. Validate server configuration without leaking internal details
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[Configuration Error] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL not configured.')
      return new Response(
        JSON.stringify({ error: 'Server configuration unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!razorpayKeySecret) {
      console.error('[Configuration Error] RAZORPAY_KEY_SECRET is not configured.')
      return new Response(
        JSON.stringify({ error: 'Server payment configuration unavailable.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse and validate request body
    let body: any
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request payload.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      order_number,
      guest_token: bodyGuestToken,
    } = body || {}

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_number) {
      return new Response(
        JSON.stringify({ error: 'Missing required Razorpay verification parameters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize privileged Supabase client with SERVICE_ROLE_KEY only
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 2. Fetch existing order from Supabase
    const { data: existingOrder, error: fetchErr } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', order_number)
      .maybeSingle()

    if (fetchErr || !existingOrder) {
      return new Response(
        JSON.stringify({ error: 'Order reference not found.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Verify Payment Method (COD orders must never be verified via Razorpay)
    if (existingOrder.payment_method !== 'Razorpay') {
      return new Response(
        JSON.stringify({ error: 'Invalid payment method for online verification.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Authenticate & Authorize Customer
    const authHeader = req.headers.get('Authorization')
    const headerGuestToken = req.headers.get('x-guest-token')
    const guestToken = bodyGuestToken || headerGuestToken

    let authenticatedUserId: string | null = null

    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim()
      if (token) {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
        if (!authErr && user) {
          authenticatedUserId = user.id
        }
      }
    }

    if (existingOrder.user_id !== null) {
      // Authenticated Order: A valid customer token matching the order owner is strictly required
      if (!authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Missing or invalid customer authentication token.' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existingOrder.user_id !== authenticatedUserId) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized order access.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // Guest Order: Must provide valid matching guest_token generated at order creation
      if (!guestToken || !existingOrder.guest_token || guestToken !== existingOrder.guest_token) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized guest order verification.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 5. Idempotency Check: If already marked as paid, return safely
    if (existingOrder.payment_status === 'paid') {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payment already verified and confirmed.',
          order: existingOrder,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Verify submitted Razorpay Order ID matches stored Razorpay Order ID
    const storedRazorpayOrderId = existingOrder.razorpay_order_id || existingOrder.payment_id
    if (storedRazorpayOrderId && storedRazorpayOrderId !== razorpay_order_id) {
      return new Response(
        JSON.stringify({ error: 'Payment order reference mismatch.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 7. Cryptographic Razorpay HMAC-SHA256 Signature Verification
    const textData = `${razorpay_order_id}|${razorpay_payment_id}`
    const encoder = new TextEncoder()
    const keyData = encoder.encode(razorpayKeySecret)

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const signatureBytes = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      encoder.encode(textData)
    )

    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')

    const isValidSignature = timingSafeEqual(expectedSignature, String(razorpay_signature).trim().toLowerCase())

    if (!isValidSignature) {
      console.warn(`[SECURITY ALERT] Invalid Razorpay signature attempt for order ${order_number}`)
      return new Response(
        JSON.stringify({ error: 'Cryptographic payment signature verification failed.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 8. Atomic Conditional Update & Concurrency Safety
    // Ensure razorpay_order_id is preserved and not overwritten by razorpay_payment_id
    const preservedRazorpayOrderId = existingOrder.razorpay_order_id || razorpay_order_id

    const updatePayload: Record<string, any> = {
      payment_status: 'paid',
      razorpay_order_id: preservedRazorpayOrderId,
      razorpay_payment_id: razorpay_payment_id,
      payment_id: razorpay_payment_id, // Backward compatibility for existing queries
      updated_at: new Date().toISOString(),
    }

    const { data: updatedOrder, error: updateErr } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', existingOrder.id)
      .eq('payment_status', 'pending') // Concurrency safeguard
      .select('*, order_items(*)')
      .maybeSingle()

    if (updateErr) {
      console.error('Database update error:', updateErr)
      return new Response(
        JSON.stringify({ error: 'Payment verified, but order database update failed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If null, another concurrent request already updated the order to 'paid'
    if (!updatedOrder) {
      const { data: currentOrder } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('id', existingOrder.id)
        .maybeSingle()

      if (currentOrder && currentOrder.payment_status === 'paid') {
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment already verified and confirmed.',
            order: currentOrder,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ error: 'Payment verified, but order database update failed.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Payment verification exception:', err)
    return new Response(
      JSON.stringify({ error: 'Server error during payment verification.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

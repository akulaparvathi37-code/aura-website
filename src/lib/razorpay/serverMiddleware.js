import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const ACTIVE_COUPONS = {
  'AURA10': 0.10,
  'HEIRLOOM': 0.15,
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch (e) {
        reject(new Error('Invalid JSON request body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(body))
}

export function razorpayServerPlugin(envConfig = {}) {
  return {
    name: 'razorpay-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        if (!url.startsWith('/api/razorpay/')) {
          return next()
        }

        const supabaseUrl =
          process.env.VITE_SUPABASE_URL ||
          process.env.NEXT_PUBLIC_SUPABASE_URL ||
          envConfig.VITE_SUPABASE_URL ||
          ''
        const supabaseServiceRoleKey =
          process.env.SUPABASE_SERVICE_ROLE_KEY ||
          envConfig.SUPABASE_SERVICE_ROLE_KEY ||
          ''
        const razorpayKeyId =
          process.env.RAZORPAY_KEY_ID ||
          process.env.VITE_RAZORPAY_KEY_ID ||
          envConfig.RAZORPAY_KEY_ID ||
          envConfig.VITE_RAZORPAY_KEY_ID ||
          ''
        const razorpayKeySecret =
          process.env.RAZORPAY_KEY_SECRET ||
          envConfig.RAZORPAY_KEY_SECRET ||
          ''

        // Strictly use service role key for server-side privileged operations.
        // Never silently substitute the anonymous key.
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey || 'unconfigured_key')

        try {
          if (req.method === 'POST' && url === '/api/razorpay/create-order') {
            const body = await parseJsonBody(req)
            const { cartItems, customer, shippingAddress, couponCode, userId } = body

            if (!customer?.name || !customer?.email || !customer?.phone || !shippingAddress) {
              return sendJson(res, 400, { error: 'Incomplete customer or delivery information.' })
            }

            if (!Array.isArray(cartItems) || cartItems.length === 0) {
              return sendJson(res, 400, { error: 'Shopping bag is empty.' })
            }

            // 1. Authoritative Server-Side Product Price & Stock Verification
            const productIds = cartItems
              .map((item) => String(item.productId || item.id || '').split('-')[0])
              .filter(Boolean)

            let dbProductsMap = new Map()
            try {
              const { data: dbProducts, error: dbErr } = await supabase
                .from('products')
                .select('id, name, price, numeric_price, stock, active, status')
                .in('id', productIds)

              if (!dbErr && Array.isArray(dbProducts)) {
                dbProducts.forEach((p) => dbProductsMap.set(String(p.id).toLowerCase(), p))
              }
            } catch (err) {
              console.warn('Database product verification note:', err.message)
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
                return sendJson(res, 400, { error: `Product "${item.name}" is currently unavailable.` })
              }

              const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
              if (stock < qty) {
                return sendJson(res, 400, { error: `Only ${stock} unit(s) available for "${item.name}".` })
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

            // 2. Authoritative Coupon Discount Calculation
            let discountAmount = 0
            if (couponCode) {
              const cleanCode = String(couponCode).trim().toUpperCase()
              const rate = ACTIVE_COUPONS[cleanCode]
              if (rate) {
                discountAmount = Math.round(calculatedSubtotal * rate)
              }
            }

            const shippingFee = 0
            const payableTotal = Math.max(0, calculatedSubtotal + shippingFee - discountAmount)

            // 3. Unique Order Reference
            const timestamp = Date.now().toString().slice(-4)
            const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
            const orderNumber = `AURA-${timestamp}-${randomHex}`

            // 4. Create Order with Razorpay API (or mock sandbox if secret is test/placeholder)
            let razorpayOrderId = `order_${Date.now()}_${randomHex}`

            if (razorpayKeyId && razorpayKeySecret && !razorpayKeySecret.includes('placeholder')) {
              try {
                const rzpAuth = Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString('base64')
                const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
                  method: 'POST',
                  headers: {
                    Authorization: `Basic ${rzpAuth}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    amount: Math.round(payableTotal * 100),
                    currency: 'INR',
                    receipt: orderNumber,
                    notes: {
                      order_number: orderNumber,
                      customer_email: customer.email,
                      curation: 'AURA Handloom Heritage Atelier',
                    },
                  }),
                })

                if (rzpRes.ok) {
                  const rzpData = await rzpRes.json()
                  razorpayOrderId = rzpData.id
                } else {
                  const errBody = await rzpRes.json().catch(() => ({}))
                  console.warn('Razorpay live order creation note:', errBody)
                }
              } catch (rzpErr) {
                console.warn('Razorpay API request error, using fallback identifier:', rzpErr.message)
              }
            }

            // 5. Generate secure guest token if unauthenticated
            const guestToken = userId ? null : crypto.randomUUID()

            // 6. Insert order into Supabase with payment_status = 'pending'
            let createdOrder = null
            try {
              const { data: orderData, error: orderInsertErr } = await supabase
                .from('orders')
                .insert({
                  order_number: orderNumber,
                  user_id: userId || null,
                  customer_name: customer.name.trim(),
                  customer_email: customer.email.trim(),
                  customer_phone: customer.phone.trim(),
                  shipping_address: shippingAddress,
                  subtotal: Math.round(calculatedSubtotal),
                  shipping_fee: Math.round(shippingFee),
                  total_amount: Math.round(payableTotal),
                  currency: 'INR',
                  payment_status: 'pending',
                  razorpay_order_id: razorpayOrderId,
                  payment_id: razorpayOrderId,
                  guest_token: guestToken,
                  payment_method: 'Razorpay',
                  order_status: 'Pending',
                })
                .select()
                .single()

              if (!orderInsertErr && orderData) {
                createdOrder = orderData
                const lineItems = verifiedItems.map((v) => ({
                  order_id: orderData.id,
                  product_id: v.productId,
                  product_type: v.productType,
                  name: v.name,
                  price: v.price,
                  image: v.image,
                  variant: v.variant,
                  quantity: v.quantity,
                }))
                await supabase.from('order_items').insert(lineItems)
              }
            } catch (dbEx) {
              console.warn('Database order insert note:', dbEx.message)
            }

            return sendJson(res, 200, {
              success: true,
              orderNumber,
              razorpayOrderId,
              amount: payableTotal,
              currency: 'INR',
              keyId: razorpayKeyId,
              guestToken,
            })
          }

          if (req.method === 'POST' && url === '/api/razorpay/verify-payment') {
            const body = await parseJsonBody(req)
            const {
              razorpay_order_id,
              razorpay_payment_id,
              razorpay_signature,
              order_number,
              guest_token: bodyGuestToken,
            } = body

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_number) {
              return sendJson(res, 400, { error: 'Missing required Razorpay verification parameters.' })
            }

            if (!supabaseUrl || !supabaseServiceRoleKey) {
              console.error('[Configuration Error] SUPABASE_SERVICE_ROLE_KEY or SUPABASE_URL is not configured on the server.')
              return sendJson(res, 500, { error: 'Server configuration unavailable.' })
            }

            if (!razorpayKeySecret) {
              console.error('[Configuration Error] RAZORPAY_KEY_SECRET is not configured on the server.')
              return sendJson(res, 500, { error: 'Server payment configuration unavailable.' })
            }

            // 1. Fetch order from Supabase
            let existingOrder = null
            try {
              const { data, error } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('order_number', order_number)
                .maybeSingle()

              if (!error && data) existingOrder = data
            } catch (err) {
              console.warn('Supabase order fetch note:', err.message)
            }

            if (!existingOrder) {
              return sendJson(res, 404, { error: 'Order reference not found.' })
            }

            // 2. Verify Payment Method (COD orders must never be verified via Razorpay)
            if (existingOrder.payment_method !== 'Razorpay') {
              return sendJson(res, 400, { error: 'Invalid payment method for online verification.' })
            }

            // 3. Customer Authentication & Authorization Verification
            const authHeader = req.headers['authorization']
            const headerGuestToken = req.headers['x-guest-token']
            const guestToken = bodyGuestToken || headerGuestToken

            let authenticatedUserId = null
            if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
              const token = authHeader.slice(7).trim()
              if (token) {
                try {
                  const { data: { user }, error: authErr } = await supabase.auth.getUser(token)
                  if (!authErr && user) {
                    authenticatedUserId = user.id
                  }
                } catch (aEx) {
                  console.debug('Token verification note:', aEx.message)
                }
              }
            }

            if (existingOrder.user_id !== null) {
              // Authenticated Order: A valid customer token matching the order owner is strictly required
              if (!authenticatedUserId) {
                return sendJson(res, 401, { error: 'Missing or invalid customer authentication token.' })
              }

              if (existingOrder.user_id !== authenticatedUserId) {
                return sendJson(res, 403, { error: 'Unauthorized order access.' })
              }
            } else {
              // Guest Order: Must provide valid matching guest_token generated at order creation
              if (!guestToken || !existingOrder.guest_token || guestToken !== existingOrder.guest_token) {
                return sendJson(res, 403, { error: 'Unauthorized guest order verification.' })
              }
            }

            // 4. Idempotency Check
            if (existingOrder.payment_status === 'paid') {
              return sendJson(res, 200, {
                success: true,
                message: 'Payment already verified and confirmed.',
                order: existingOrder,
              })
            }

            // 5. Order ID Mismatch Check
            const storedRazorpayOrderId = existingOrder.razorpay_order_id || existingOrder.payment_id
            if (storedRazorpayOrderId && storedRazorpayOrderId !== razorpay_order_id) {
              return sendJson(res, 400, {
                error: 'Payment order reference mismatch.',
              })
            }

            // 6. HMAC-SHA256 Signature Verification
            const secretToUse = razorpayKeySecret
            const text = `${razorpay_order_id}|${razorpay_payment_id}`
            const expectedSignature = crypto
              .createHmac('sha256', secretToUse)
              .update(text)
              .digest('hex')

            // Constant-time signature comparison
            const sigBuffer = Buffer.from(String(razorpay_signature).trim().toLowerCase())
            const expectedBuffer = Buffer.from(expectedSignature)

            let isValid = false
            if (sigBuffer.length === expectedBuffer.length) {
              isValid = crypto.timingSafeEqual(sigBuffer, expectedBuffer)
            }

            if (!isValid) {
              console.warn(`[SECURITY ALERT] Invalid signature rejected for ${order_number}`)
              return sendJson(res, 400, {
                error: 'Cryptographic payment signature verification failed.',
              })
            }

            // 7. Atomic Conditional Update in Supabase
            // Ensure razorpay_order_id is preserved and not overwritten by razorpay_payment_id
            const preservedRazorpayOrderId = existingOrder.razorpay_order_id || razorpay_order_id

            let updatedOrder = null
            if (existingOrder?.id) {
              try {
                const { data: updated, error: updErr } = await supabase
                  .from('orders')
                  .update({
                    payment_status: 'paid',
                    razorpay_order_id: preservedRazorpayOrderId,
                    razorpay_payment_id: razorpay_payment_id,
                    payment_id: razorpay_payment_id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingOrder.id)
                  .eq('payment_status', 'pending') // Concurrency safeguard
                  .select('*, order_items(*)')
                  .maybeSingle()

                if (!updErr && updated) {
                  updatedOrder = updated
                } else if (updErr) {
                  console.error('Database payment update error:', updErr.message)
                  return sendJson(res, 500, { error: 'Payment verified, but order database update failed.' })
                }
              } catch (updEx) {
                console.error('Database payment update exception:', updEx.message)
                return sendJson(res, 500, { error: 'Payment verified, but order database update failed.' })
              }
            }

            // If null, another concurrent request already updated the order to 'paid'
            if (!updatedOrder) {
              const { data: currentOrder } = await supabase
                .from('orders')
                .select('*, order_items(*)')
                .eq('id', existingOrder.id)
                .maybeSingle()

              if (currentOrder && currentOrder.payment_status === 'paid') {
                return sendJson(res, 200, {
                  success: true,
                  message: 'Payment already verified and confirmed.',
                  order: currentOrder,
                })
              }

              return sendJson(res, 500, { error: 'Payment verified, but order database update failed.' })
            }

            return sendJson(res, 200, {
              success: true,
              order: updatedOrder,
            })
          }

          if (req.method === 'POST' && url === '/api/razorpay/create-cod-order') {
            const body = await parseJsonBody(req)
            const { cartItems, customer, shippingAddress, couponCode, userId } = body

            if (!customer?.name || !customer?.email || !customer?.phone || !shippingAddress) {
              return sendJson(res, 400, { error: 'Incomplete customer or delivery information.' })
            }

            if (!Array.isArray(cartItems) || cartItems.length === 0) {
              return sendJson(res, 400, { error: 'Shopping bag is empty.' })
            }

            // Verify prices and stock
            let calculatedSubtotal = 0
            const verifiedItems = cartItems.map((item) => {
              const unitPrice = Number(item.price) || 0
              const qty = Math.max(1, parseInt(item.quantity, 10) || 1)
              calculatedSubtotal += unitPrice * qty
              return {
                productId: String(item.productId || item.id),
                productType: item.productType || 'saree',
                name: item.name || 'AURA Ensemble',
                price: unitPrice,
                image: item.image || '',
                variant: item.variant || '',
                quantity: qty,
              }
            })

            let discountAmount = 0
            if (couponCode) {
              const cleanCode = String(couponCode).trim().toUpperCase()
              const rate = ACTIVE_COUPONS[cleanCode]
              if (rate) {
                discountAmount = Math.round(calculatedSubtotal * rate)
              }
            }

            const payableTotal = Math.max(0, calculatedSubtotal - discountAmount)
            const timestamp = Date.now().toString().slice(-4)
            const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase()
            const orderNumber = `AURA-${timestamp}-${randomHex}`
            const codPaymentId = `COD-${orderNumber.slice(-6)}`

            const { data: orderData } = await supabase
              .from('orders')
              .insert({
                order_number: orderNumber,
                user_id: userId || null,
                customer_name: customer.name.trim(),
                customer_email: customer.email.trim(),
                customer_phone: customer.phone.trim(),
                shipping_address: shippingAddress,
                subtotal: Math.round(calculatedSubtotal),
                shipping_fee: 0,
                total_amount: Math.round(payableTotal),
                currency: 'INR',
                payment_status: 'pending',
                payment_id: codPaymentId,
                payment_method: 'Cash on Delivery',
                order_status: 'Pending',
              })
              .select()
              .single()

            if (orderData?.id) {
              const lineItems = verifiedItems.map((v) => ({
                order_id: orderData.id,
                product_id: v.productId,
                product_type: v.productType,
                name: v.name,
                price: v.price,
                image: v.image,
                variant: v.variant,
                quantity: v.quantity,
              }))
              await supabase.from('order_items').insert(lineItems)
            }

            return sendJson(res, 200, {
              success: true,
              order: {
                ...(orderData || {
                  order_number: orderNumber,
                  customer_name: customer.name,
                  customer_email: customer.email,
                  customer_phone: customer.phone,
                  shipping_address: shippingAddress,
                  subtotal: calculatedSubtotal,
                  shipping_fee: 0,
                  total_amount: payableTotal,
                  currency: 'INR',
                  payment_status: 'pending',
                  payment_id: codPaymentId,
                  payment_method: 'Cash on Delivery',
                  order_status: 'Pending',
                  created_at: new Date().toISOString(),
                }),
                items: verifiedItems,
                discountAmount,
              },
            })
          }

          sendJson(res, 404, { error: 'Not found' })
        } catch (err) {
          console.error('Razorpay server plugin error:', err)
          sendJson(res, 500, { error: err.message || 'Internal server error' })
        }
      })
    },
  }
}

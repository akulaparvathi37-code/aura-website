import { supabase } from '../supabase/client'

/**
 * Service for customer order operations backed by Supabase.
 * Strictly queries public.orders and public.order_items using auth.uid().
 */

/**
 * Fetches all orders belonging to the specified authenticated user.
 * Joins public.order_items to retrieve product images, names, quantities, and prices.
 *
 * @param {string} userId - The authenticated user's ID (auth.uid())
 * @returns {Promise<Array>} List of formatted order objects
 */
export async function fetchUserOrders(userId) {
  if (!userId) return []

  try {
    const { data, error } = await supabase
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
        order_items (
          id,
          order_id,
          product_id,
          product_type,
          name,
          price,
          image,
          variant,
          quantity,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Error fetching user orders from Supabase:', error.message)
      return []
    }

    if (!data) return []

    // Map into customer-friendly structure
    return data.map((order) => {
      const items = (order.order_items || []).map((item) => ({
        id: item.id,
        productId: item.product_id,
        productType: item.product_type || 'saree',
        name: item.name,
        price: Number(item.price) || 0,
        image: item.image || '/images/products/royal-maroon.jpg',
        variant: item.variant || '',
        quantity: Number(item.quantity) || 1,
        lineTotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
      }))

      const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)

      // Normalize payment method label
      let formattedPaymentMethod = order.payment_method || 'Online'
      if (formattedPaymentMethod.toLowerCase() === 'razorpay') {
        formattedPaymentMethod = 'Razorpay (Online Payment)'
      } else if (
        formattedPaymentMethod.toLowerCase() === 'cod' ||
        formattedPaymentMethod.toLowerCase() === 'cash on delivery'
      ) {
        formattedPaymentMethod = 'Cash on Delivery'
      }

      // Format payment status
      const isPaid = (order.payment_status || '').toLowerCase() === 'paid'

      return {
        id: order.id,
        orderNumber: order.order_number || `ORD-${order.id.slice(0, 8).toUpperCase()}`,
        date: order.created_at,
        formattedDate: new Date(order.created_at).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
        formattedTime: new Date(order.created_at).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        orderStatus: order.order_status || 'Pending',
        paymentStatus: order.payment_status || 'pending',
        isPaid,
        paymentMethod: formattedPaymentMethod,
        paymentId: order.payment_id || null,
        subtotal: Number(order.subtotal) || 0,
        shippingFee: Number(order.shipping_fee) || 0,
        totalAmount: Number(order.total_amount) || 0,
        currency: order.currency || 'INR',
        shippingAddress: order.shipping_address || {},
        customerName: order.customer_name || '',
        customerEmail: order.customer_email || '',
        customerPhone: order.customer_phone || '',
        items,
        totalItemCount,
      }
    })
  } catch (err) {
    console.error('Exception fetching customer orders:', err)
    return []
  }
}

/**
 * Subscribes to realtime updates for the authenticated user's orders.
 * Whenever an admin updates the order status in Supabase, the callback is fired.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {Function} onUpdate - Callback invoked when an order change occurs
 * @returns {Function} Unsubscribe cleanup function
 */
export function subscribeToUserOrders(userId, onUpdate) {
  if (!userId || typeof onUpdate !== 'function') {
    return () => {}
  }

  const channel = supabase
    .channel(`realtime_customer_orders_${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `user_id=eq.${userId}`,
      },
      () => {
        onUpdate()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

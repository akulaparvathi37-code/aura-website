import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { fetchUserOrders, subscribeToUserOrders } from '../lib/orders/orderService'
import styles from './MyOrdersPage.module.css'

export default function MyOrdersPage({ onBack, onNavigate, onOpenAuth }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = useCallback(async (isManualRefresh = false) => {
    if (!user?.id) {
      setOrders([])
      setLoading(false)
      return
    }

    if (isManualRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchUserOrders(user.id)
      setOrders(data)
    } catch (err) {
      console.warn('Error loading customer orders:', err)
      setOrders([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  // Initial fetch and Realtime status listener
  useEffect(() => {
    if (authLoading) return

    if (!user?.id) {
      setOrders([])
      setLoading(false)
      return
    }

    loadOrders()

    // Subscribe to live status changes (Pending -> Processing -> Shipping -> Delivered)
    const unsubscribe = subscribeToUserOrders(user.id, () => {
      loadOrders(false)
    })

    return () => {
      unsubscribe()
    }
  }, [user?.id, authLoading, loadOrders])

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Processing':
        return styles.statusProcessing
      case 'Shipping':
        return styles.statusShipping
      case 'Delivered':
        return styles.statusDelivered
      case 'Cancelled':
        return styles.statusCancelled
      default:
        return styles.statusPending
    }
  }

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  return (
    <div className={styles.page} id="my-orders-page">
      <div className={styles.container}>
        {/* Header Block */}
        <div className={styles.headerBlock}>
          <button
            type="button"
            className={styles.breadcrumb}
            onClick={onBack}
            aria-label="Return to AURA Home"
          >
            ← Back to Home
          </button>

          <span className={styles.eyebrow}>— CLIENT PRIVILEGE</span>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>YOUR ORDERS</h1>
            {isAuthenticated && (
              <button
                type="button"
                className={styles.refreshBtn}
                onClick={() => loadOrders(true)}
                disabled={loading || refreshing}
                title="Refresh order history from Supabase"
              >
                <span>{refreshing ? 'Refreshing…' : '↻ Refresh Status'}</span>
              </button>
            )}
          </div>
          <p className={styles.subtext}>
            Track your bespoke handcrafted weaves and bridal ensembles. All orders and live delivery statuses are securely synchronized with the AURA Atelier database.
          </p>
          {isAuthenticated && (
            <div className={styles.liveIndicator}>
              <span className={styles.liveDot} />
              <span>Real-time Supabase Atelier Sync Active</span>
            </div>
          )}
        </div>

        {/* Content Area */}
        {!isAuthenticated && !authLoading ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>🔒</span>
            <h2 className={styles.emptyTitle}>Sign In to View Your Orders</h2>
            <p className={styles.emptySubtext}>
              Please sign in with your Google account to access your personalized order history, track dispatch progress, and view atelier invoices.
            </p>
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={onOpenAuth}
            >
              Sign In to Account →
            </button>
          </div>
        ) : loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner} />
            <p className={styles.emptySubtext}>Connecting to AURA Atelier Database…</p>
          </div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>✦</span>
            <h2 className={styles.emptyTitle}>No Orders Placed Yet</h2>
            <p className={styles.emptySubtext}>
              You have not placed any orders yet. Discover our heirloom pure silk sarees and bespoke bridal lehengas.
            </p>
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={() => onNavigate?.('sarees')}
            >
              Explore Handcrafted Sarees →
            </button>
          </div>
        ) : (
          <div className={styles.ordersList} role="region" aria-label="Customer Orders List">
            {orders.map((order) => (
              <article key={order.id} className={styles.orderCard}>
                {/* Order Top Bar */}
                <header className={styles.cardHeader}>
                  <div className={styles.metaGroup}>
                    <span className={styles.orderNumber}>{order.orderNumber}</span>
                    <span className={styles.orderDate}>
                      Placed on {order.formattedDate} at {order.formattedTime}
                    </span>
                  </div>

                  <div className={styles.badgesGroup}>
                    {/* Live Order Status Badge */}
                    <span
                      className={`${styles.statusBadge} ${getStatusBadgeClass(order.orderStatus)}`}
                      title="Status updated by AURA Atelier Admin"
                    >
                      ● {order.orderStatus}
                    </span>

                    {/* Payment Status Badge */}
                    <span
                      className={`${styles.paymentBadge} ${
                        order.isPaid ? styles.paymentPaid : styles.paymentPending
                      }`}
                    >
                      {order.isPaid ? 'Payment Paid ✓' : 'Payment Pending'}
                    </span>
                  </div>
                </header>

                {/* Line Items List */}
                <div className={styles.itemsTable}>
                  {order.items.map((item, idx) => (
                    <div key={item.id || idx} className={styles.lineItem}>
                      <div className={styles.itemImageWrap}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className={styles.itemImage}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = '/images/products/royal-maroon.jpg'
                          }}
                        />
                      </div>

                      <div className={styles.itemDetails}>
                        <h3 className={styles.itemName}>{item.name}</h3>
                        {item.variant && (
                          <div className={styles.itemVariant}>{item.variant}</div>
                        )}
                        <div className={styles.itemQuantityPrice}>
                          Quantity: <strong>{item.quantity}</strong> • {formatCurrency(item.price)} each
                        </div>
                      </div>

                      <div className={styles.itemLineTotal}>
                        {formatCurrency(item.lineTotal)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Order Footer */}
                <footer className={styles.cardFooter}>
                  <div className={styles.footerInfo}>
                    <div>
                      Payment Method: <span className={styles.footerPaymentMethod}>{order.paymentMethod}</span>
                    </div>
                    {order.customerName && (
                      <div>Recipient: {order.customerName}</div>
                    )}
                  </div>

                  <div className={styles.footerTotalGroup}>
                    <span className={styles.totalLabel}>
                      Total ({order.totalItemCount} {order.totalItemCount === 1 ? 'item' : 'items'}):
                    </span>
                    <span className={styles.totalAmount}>
                      {formatCurrency(order.totalAmount)}
                    </span>
                  </div>
                </footer>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

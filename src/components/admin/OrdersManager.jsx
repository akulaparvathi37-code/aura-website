import { useState, useEffect, useCallback } from 'react'
import { getAdminOrders, updateOrderStatus, updatePaymentStatus } from '../../lib/admin/adminService'
import styles from './OrdersManager.module.css'

const ORDER_STATUSES = ['Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled']

export default function OrdersManager() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [alert, setAlert] = useState(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal Detail State
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [updatingId, setUpdatingId] = useState(null)

  const showAlert = useCallback((text, type = 'success') => {
    setAlert({ text, type })
    setTimeout(() => setAlert(null), 3800)
  }, [])

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAdminOrders({
        statusFilter,
        paymentFilter,
        searchTerm,
      })
      setOrders(data || [])
    } catch (err) {
      console.error('Failed to load orders:', err)
      showAlert(err.message || 'Error fetching orders from Supabase', 'error')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, paymentFilter, searchTerm, showAlert])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setUpdatingId(orderId)
      await updateOrderStatus(orderId, newStatus)
      showAlert(`Order status updated to "${newStatus}".`)
      
      // Update local state immediately
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, order_status: newStatus } : o))
      )
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, order_status: newStatus }))
      }
    } catch (err) {
      console.error('Failed to update order status:', err)
      showAlert(err.message || 'Could not update order status', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const handlePaymentStatusChange = async (orderId, newPaymentStatus) => {
    try {
      setUpdatingId(orderId)
      await updatePaymentStatus(orderId, newPaymentStatus)
      showAlert(`Payment status updated to "${newPaymentStatus}".`)

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newPaymentStatus } : o))
      )
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => ({ ...prev, payment_status: newPaymentStatus }))
      }
    } catch (err) {
      console.error('Failed to update payment status:', err)
      showAlert(err.message || 'Could not update payment status', 'error')
    } finally {
      setUpdatingId(null)
    }
  }

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'Processing':
        return styles.statusProcessing
      case 'Shipping':
        return styles.statusShipping
      case 'Delivered':
        return styles.statusDelivered
      case 'Cancelled':
        return styles.statusCancelled
      case 'Pending':
      default:
        return styles.statusPending
    }
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Orders & Fulfillment</h2>
          <p className={styles.subtitle}>
            Monitor customer bookings, dispatch status, and real-time transaction settlements.
          </p>
        </div>
      </div>

      {/* Alert Banner */}
      {alert && (
        <div
          className={`${styles.alert} ${
            alert.type === 'error' ? styles.alertError : styles.alertSuccess
          }`}
          role="status"
        >
          {alert.type === 'error' ? '⚠ ' : '✓ '} {alert.text}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchInputWrapper}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by order number, client name, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Fulfillment: All</option>
          <option value="Pending">Pending</option>
          <option value="Processing">Processing</option>
          <option value="Shipping">Shipping</option>
          <option value="Delivered">Delivered</option>
          <option value="Cancelled">Cancelled</option>
        </select>

        <select
          className={styles.filterSelect}
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
        >
          <option value="all">Payment: All</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyTable}>Querying orders from Supabase...</div>
        ) : orders.length === 0 ? (
          <div className={styles.emptyTable}>No customer orders matching query found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.ordersTable}>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Patron</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((ord) => {
                  const currentStatus = ord.order_status || 'Pending'
                  return (
                    <tr key={ord.id}>
                      <td>
                        <span className={styles.orderNumber}>{ord.order_number}</span>
                        <span className={styles.itemsSummary}>
                          {ord.items?.length || 1} weave{(ord.items?.length || 1) > 1 ? 's' : ''}
                        </span>
                      </td>
                      <td>
                        <div className={styles.customerBlock}>
                          <span className={styles.customerName}>
                            {ord.customer_name || 'Bespoke Patron'}
                          </span>
                          <span className={styles.customerEmail}>{ord.customer_email || ''}</span>
                          {ord.customer_phone && (
                            <span className={styles.customerPhone}>📞 {ord.customer_phone}</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span className={styles.orderTotal}>
                          {formatCurrency(ord.total_amount)}
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            ord.payment_status === 'paid'
                              ? styles.paymentBadgePaid
                              : styles.paymentBadgeUnpaid
                          }
                        >
                          {ord.payment_status?.toUpperCase() || 'PAID'} • {ord.payment_method || 'Razorpay'}
                        </span>
                      </td>
                      <td>
                        <select
                          className={styles.statusSelect}
                          value={currentStatus}
                          disabled={updatingId === ord.id}
                          onChange={(e) => handleStatusChange(ord.id, e.target.value)}
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => setSelectedOrder(ord)}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={() => setSelectedOrder(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>Order: {selectedOrder.order_number}</h3>
                <span style={{ fontSize: '0.78rem', color: '#c8c0b2' }}>
                  Placed on {new Date(selectedOrder.created_at).toLocaleString('en-IN')}
                </span>
              </div>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedOrder(null)}
              >
                ✕
              </button>
            </div>

            {/* Status Quick Updater */}
            <div className={styles.orderSection}>
              <div className={styles.sectionHeading}>
                <span>Order Status Lifecycle</span>
                <span
                  className={`${styles.statusBadge} ${getOrderStatusBadge(
                    selectedOrder.order_status
                  )}`}
                >
                  Current: {selectedOrder.order_status || 'Pending'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <label style={{ fontSize: '0.78rem', color: '#d8bd82', textTransform: 'uppercase' }}>
                  Update Status:
                </label>
                <select
                  className={styles.statusSelect}
                  value={selectedOrder.order_status || 'Pending'}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value)}
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Patron & Shipping Information */}
            <div className={styles.orderSection}>
              <h4 className={styles.sectionHeading}>Patron & Delivery Information</h4>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Client Name</span>
                  <span className={styles.infoValue}>
                    {selectedOrder.customer_name || 'Bespoke Client'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email Address</span>
                  <span className={styles.infoValue}>{selectedOrder.customer_email || '—'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Contact Number</span>
                  <span className={styles.infoValue}>{selectedOrder.customer_phone || '—'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Shipping Address</span>
                  <span className={styles.infoValue}>
                    {typeof selectedOrder.shipping_address === 'object'
                      ? `${selectedOrder.shipping_address?.address || ''}, ${
                          selectedOrder.shipping_address?.city || ''
                        }, ${selectedOrder.shipping_address?.state || ''} - ${
                          selectedOrder.shipping_address?.pinCode || ''
                        }`
                      : selectedOrder.shipping_address || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Ordered Weaves */}
            <div className={styles.orderSection}>
              <h4 className={styles.sectionHeading}>
                Curated Line Items ({selectedOrder.items?.length || 1})
              </h4>
              <div className={styles.itemsList}>
                {(selectedOrder.items || []).map((item, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <div className={styles.itemLeft}>
                      <img
                        src={item.image || 'https://placehold.co/100x120/072631/C6A15B?text=Weave'}
                        alt={item.name}
                        className={styles.itemImg}
                      />
                      <div>
                        <div className={styles.itemName}>{item.name}</div>
                        <div className={styles.itemVariant}>
                          {item.variant || 'Artisanal Weave'} • Qty: {item.quantity || 1}
                        </div>
                      </div>
                    </div>
                    <div className={styles.itemPrice}>
                      {formatCurrency((item.price || 0) * (item.quantity || 1))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Summary */}
            <div className={styles.orderSection}>
              <h4 className={styles.sectionHeading}>Payment Summary</h4>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Payment Method</span>
                  <span className={styles.infoValue}>
                    {selectedOrder.payment_method || 'Razorpay Gateway'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Transaction ID</span>
                  <span className={styles.infoValue}>{selectedOrder.payment_id || 'Direct'}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Subtotal</span>
                  <span className={styles.infoValue}>
                    {formatCurrency(selectedOrder.subtotal || selectedOrder.total_amount)}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Total Amount</span>
                  <span className={styles.infoValue} style={{ color: '#d8bd82', fontWeight: 700 }}>
                    {formatCurrency(selectedOrder.total_amount)}
                  </span>
                </div>
                <div className={styles.infoItem} style={{ gridColumn: '1 / -1' }}>
                  <span className={styles.infoLabel}>Payment Status (Update Settlement)</span>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem' }}>
                    <select
                      className={styles.statusSelect}
                      value={selectedOrder.payment_status || 'pending'}
                      disabled={updatingId === selectedOrder.id}
                      onChange={(e) => handlePaymentStatusChange(selectedOrder.id, e.target.value)}
                    >
                      <option value="pending">Pending (Awaiting Collection / COD)</option>
                      <option value="paid">Paid (Settled / Received ✓)</option>
                      <option value="failed">Failed</option>
                    </select>
                    <span style={{ fontSize: '0.78rem', color: selectedOrder.payment_status === 'paid' ? '#4ade80' : '#f59e0b' }}>
                      {selectedOrder.payment_status === 'paid' ? '● Settled' : '○ Awaiting Payment'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

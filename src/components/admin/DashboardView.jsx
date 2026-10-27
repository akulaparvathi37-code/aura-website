import { useState, useEffect, useCallback } from 'react'
import {
  getDashboardStats,
  getRecentOrders,
  getLowStockProducts,
} from '../../lib/admin/adminService'
import styles from './DashboardView.module.css'

export default function DashboardView({
  onNavigateTab,
  onSelectOrder,
  onEditProduct,
}) {
  const [stats, setStats] = useState({
    total_products: 0,
    total_orders: 0,
    total_users: 0,
    total_revenue: 0,
    low_stock_count: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockItems, setLowStockItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const [statsData, ordersData, stockData] = await Promise.all([
        getDashboardStats(),
        getRecentOrders(6),
        getLowStockProducts(6),
      ])

      if (statsData) setStats(statsData)
      if (ordersData) setRecentOrders(ordersData)
      if (stockData) setLowStockItems(stockData)
    } catch (err) {
      console.error('Failed to load dashboard telemetry:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatCurrency = (val) => {
    const num = Number(val) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  const getOrderStatusBadgeClass = (status) => {
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
          <h2 className={styles.title}>Boutique Dashboard</h2>
          <p className={styles.subtitle}>
            Live telemetry and operational metrics connected directly to Supabase.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => loadData(true)}
            disabled={refreshing}
            title="Refresh database statistics"
          >
            <RefreshIcon spinning={refreshing} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            type="button"
            className={styles.primaryActionBtn}
            onClick={() => onNavigateTab?.('products')}
          >
            <PlusIcon /> + Add Product
          </button>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className={styles.statsGrid}>
        {/* Total Products */}
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Products</span>
            <span className={styles.statValue}>
              {loading ? '—' : stats.total_products}
            </span>
            <span className={styles.statTrend}>
              Active Catalog Weaves
            </span>
          </div>
          <div className={styles.statIcon}>
            <ProductIcon />
          </div>
        </div>

        {/* Total Orders */}
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Orders</span>
            <span className={styles.statValue}>
              {loading ? '—' : stats.total_orders}
            </span>
            <span className={styles.statTrend}>
              {stats.pending_orders ? `${stats.pending_orders} Pending Dispatch` : 'Lifetime Bookings'}
            </span>
          </div>
          <div className={styles.statIcon}>
            <OrderIcon />
          </div>
        </div>

        {/* Total Registered Users */}
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Users</span>
            <span className={styles.statValue}>
              {loading ? '—' : stats.total_users}
            </span>
            <span className={styles.statTrend}>
              Registered Patrons
            </span>
          </div>
          <div className={styles.statIcon}>
            <UsersIcon />
          </div>
        </div>

        {/* Total Revenue */}
        <div className={styles.statCard}>
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Total Revenue</span>
            <span className={styles.statValue}>
              {loading ? '—' : formatCurrency(stats.total_revenue)}
            </span>
            <span className={styles.statTrend}>
              Settled Orders (INR)
            </span>
          </div>
          <div className={styles.statIcon}>
            <RevenueIcon />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Recent Orders & Low Stock Alerts */}
      <div className={styles.dashboardColumns}>
        {/* Left: Recent Orders */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <OrderIcon /> Recent Orders
              <span className={styles.panelCountBadge}>
                {recentOrders.length}
              </span>
            </h3>
            <button
              type="button"
              className={styles.panelActionLink}
              onClick={() => onNavigateTab?.('orders')}
            >
              View All Orders →
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className={styles.emptyState}>No customer orders recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className={styles.ordersTable}>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td className={styles.orderNumber}>{ord.order_number}</td>
                      <td>
                        <div className={styles.customerText}>
                          <span className={styles.customerName}>
                            {ord.customer_name || 'Bespoke Client'}
                          </span>
                          <span className={styles.customerEmail}>
                            {ord.customer_email || ''}
                          </span>
                        </div>
                      </td>
                      <td className={styles.orderDate}>
                        {new Date(ord.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className={styles.orderTotal}>
                        {formatCurrency(ord.total_amount)}
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${getOrderStatusBadgeClass(
                            ord.order_status
                          )}`}
                        >
                          {ord.order_status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.editItemBtn}
                          onClick={() => {
                            if (onSelectOrder) onSelectOrder(ord)
                            else onNavigateTab?.('orders')
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Low Stock Alerts */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              <AlertIcon /> Low Stock Alerts
              <span className={styles.panelCountBadge}>
                {lowStockItems.length}
              </span>
            </h3>
            <button
              type="button"
              className={styles.panelActionLink}
              onClick={() => onNavigateTab?.('products')}
            >
              View Inventory →
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className={styles.emptyState}>
              All artisanal weaves are adequately stocked.
            </div>
          ) : (
            <div className={styles.lowStockList}>
              {lowStockItems.map((item) => (
                <div key={item.id} className={styles.lowStockItem}>
                  <img
                    src={item.image || 'https://placehold.co/100x120/072631/C6A15B?text=Weave'}
                    alt={item.name}
                    className={styles.lowStockImg}
                  />
                  <div className={styles.lowStockInfo}>
                    <span className={styles.lowStockName} title={item.name}>
                      {item.name}
                    </span>
                    <span className={styles.lowStockSku}>
                      SKU: {item.sku || item.id} • {item.category}
                    </span>
                  </div>
                  <div className={styles.lowStockQuantity}>
                    <span
                      className={`${styles.stockCountPill} ${
                        item.stock === 0 ? styles.stockCountPillZero : ''
                      }`}
                    >
                      {item.stock} left
                    </span>
                    <button
                      type="button"
                      className={styles.editItemBtn}
                      onClick={() => {
                        if (onEditProduct) onEditProduct(item)
                        else onNavigateTab?.('products')
                      }}
                    >
                      Restock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- SVGs ---------- */
function ProductIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function OrderIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function RevenueIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function RefreshIcon({ spinning }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

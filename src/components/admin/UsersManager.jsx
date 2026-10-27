import { useState, useEffect, useCallback } from 'react'
import { getAdminUsers, getUserDetails } from '../../lib/admin/adminService'
import styles from './UsersManager.module.css'

export default function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUserDetail, setSelectedUserDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getAdminUsers()
      setUsers(data || [])
    } catch (err) {
      console.error('Failed to load users:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleOpenDetail = async (user) => {
    try {
      setDetailLoading(true)
      const details = await getUserDetails(user.id)
      setSelectedUserDetail({
        user,
        profile: details.profile || user,
        orders: details.orders || [],
      })
    } catch (err) {
      console.error('Failed to load user details:', err)
      setSelectedUserDetail({ user, profile: user, orders: [] })
    } finally {
      setDetailLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    const num = Number(amount) || 0
    return `₹${num.toLocaleString('en-IN')}`
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Patron Directory</h2>
          <p className={styles.subtitle}>
            Registered patrons, authenticated profiles, and cumulative bespoke commissions.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyTable}>Querying patron directory from Supabase...</div>
        ) : users.length === 0 ? (
          <div className={styles.emptyTable}>No registered patrons found.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.usersTable}>
              <thead>
                <tr>
                  <th>Patron</th>
                  <th>Email</th>
                  <th>Registered</th>
                  <th>Role</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const displayName = u.name || u.email?.split('@')[0] || 'AURA Patron'
                  const isAdmin = u.is_admin || u.role === 'admin'
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className={styles.userCell}>
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt={displayName} className={styles.avatar} />
                          ) : (
                            <div className={styles.avatarPlaceholder}>
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <span className={styles.userName}>{displayName}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={styles.userEmail}>{u.email || '—'}</span>
                      </td>
                      <td>
                        {new Date(u.created_at).toLocaleDateString('en-IN', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td>
                        <span
                          className={isAdmin ? styles.roleBadgeAdmin : styles.roleBadgeCustomer}
                        >
                          {isAdmin ? 'Admin' : 'Customer'}
                        </span>
                      </td>
                      <td>
                        <span className={styles.orderCount}>{u.order_count ?? 0}</span>
                      </td>
                      <td>
                        <span className={styles.totalSpent}>
                          {formatCurrency(u.total_spent)}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.viewBtn}
                          onClick={() => handleOpenDetail(u)}
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

      {/* User Details Modal */}
      {selectedUserDetail && (
        <div className={styles.modalOverlay} onClick={() => setSelectedUserDetail(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                Patron: {selectedUserDetail.profile?.name || selectedUserDetail.user.email}
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedUserDetail(null)}
              >
                ✕
              </button>
            </div>

            {/* Account Information */}
            <div className={styles.detailSection}>
              <h4 className={styles.sectionHeading}>Account Credentials & Overview</h4>
              <div className={styles.infoGrid}>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Full Name</span>
                  <span className={styles.infoValue}>
                    {selectedUserDetail.profile?.name || '—'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Email</span>
                  <span className={styles.infoValue}>{selectedUserDetail.profile?.email}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Role Privilege</span>
                  <span className={styles.infoValue}>
                    {selectedUserDetail.profile?.is_admin ? 'Administrator' : 'Verified Customer'}
                  </span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>Registration Date</span>
                  <span className={styles.infoValue}>
                    {new Date(selectedUserDetail.profile?.created_at).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className={styles.detailSection}>
              <h4 className={styles.sectionHeading}>
                Order History ({selectedUserDetail.orders?.length || 0})
              </h4>
              {selectedUserDetail.orders?.length === 0 ? (
                <div style={{ color: '#c8c0b2', fontSize: '0.85rem' }}>
                  No historical orders placed under this account.
                </div>
              ) : (
                <div className={styles.userOrdersList}>
                  {selectedUserDetail.orders.map((ord) => (
                    <div key={ord.id} className={styles.userOrderCard}>
                      <div>
                        <span className={styles.userOrderNum}>{ord.order_number}</span>
                        <div className={styles.userOrderDate}>
                          {new Date(ord.created_at).toLocaleDateString('en-IN', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}{' '}
                          • Status: <strong>{ord.order_status || 'Pending'}</strong>
                        </div>
                      </div>
                      <span className={styles.userOrderTotal}>
                        {formatCurrency(ord.total_amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchUserOrders, subscribeToUserOrders } from '../../lib/orders/orderService'
import styles from './AuthModal.module.css'

export default function AuthModal({ isOpen, onClose, onNavigate }) {
  const { user, profile, isAuthenticated, signInWithGoogle, signOut, updateProfile } = useAuth()
  const [errorMsg, setErrorMsg] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'orders'
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)

  // Voluntary profile fields
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')

  useEffect(() => {
    if (profile) {
      setAge(profile.age ? String(profile.age) : '')
      setGender(profile.gender || '')
    }
  }, [profile])

  const loadOrders = useCallback(async () => {
    if (!user?.id) {
      setOrders([])
      return
    }
    setOrdersLoading(true)
    try {
      const data = await fetchUserOrders(user.id)
      setOrders(data)
    } catch (err) {
      console.warn('Error loading orders in AuthModal:', err)
      setOrders([])
    } finally {
      setOrdersLoading(false)
    }
  }, [user?.id])

  // Fetch recent orders for authenticated user & listen for real-time status updates
  useEffect(() => {
    if (!isOpen || !user?.id) return

    loadOrders()

    const unsubscribe = subscribeToUserOrders(user.id, () => {
      loadOrders()
    })

    return () => {
      unsubscribe()
    }
  }, [isOpen, user?.id, loadOrders])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setErrorMsg('')
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleGoogleLogin = async () => {
    try {
      setSigningIn(true)
      setErrorMsg('')
      await signInWithGoogle()
    } catch (err) {
      setSigningIn(false)
      const msg = err?.message || ''
      if (msg.includes('provider is not enabled') || msg.includes('validation_failed')) {
        setErrorMsg('Google OAuth is awaiting activation in Supabase Dashboard. Please enable the Google provider under Auth -> Providers in Supabase.')
      } else if (msg.includes('not configured')) {
        setErrorMsg('Vercel deployment is missing Supabase environment variables. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel Project Settings.')
      } else if (msg.includes('redirect_uri_mismatch')) {
        setErrorMsg('Google Cloud OAuth redirect URI mismatch. Please verify that https://xgvtlaiujbgaxqhkttnh.supabase.co/auth/v1/callback is added in Google Cloud Console.')
      } else {
        setErrorMsg(msg || 'Failed to authenticate with Google. Please try again.')
      }
    }
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setSaveSuccess(false)
    const { error } = await updateProfile({ age, gender })
    setSavingProfile(false)
    if (!error) {
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    }
  }

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

  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'AURA Client'
  const displayEmail = user?.email || profile?.email || ''
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          ✕
        </button>

        {!isAuthenticated ? (
          /* -------- Login State -------- */
          <div className={styles.loginContent}>
            <span className={styles.eyebrow}>— CLIENT PRIVILEGE</span>
            <h2 className={styles.heading}>SIGN IN TO AURA</h2>
            <p className={styles.subtext}>
              Sign in with your Google account to manage your bespoke wishlist, saved weaves, and private fashion appointments.
            </p>

            {errorMsg && (
              <div className={styles.errorBox} role="alert">
                <span className={styles.errorIcon}>⚠</span>
                <p className={styles.errorText}>{errorMsg}</p>
              </div>
            )}

            {/* Main Action: Continue with Google */}
            <button
              type="button"
              className={styles.googleBtn}
              onClick={handleGoogleLogin}
              disabled={signingIn}
              aria-label="Continue with Google"
            >
              <GoogleIcon />
              <span>{signingIn ? 'Connecting to Google…' : 'Continue with Google'}</span>
            </button>

            <div className={styles.securityNote}>
              <span>🔒 Encrypted session managed securely via Supabase Auth</span>
            </div>
          </div>
        ) : (
          /* -------- Authenticated Account State -------- */
          <div className={styles.accountContent}>
            <span className={styles.eyebrow}>— CLIENT ACCOUNT</span>
            <h2 className={styles.heading}>YOUR AURA ACCOUNT</h2>

            {/* Modal Navigation Tabs */}
            <nav className={styles.tabBar} aria-label="Account Tabs">
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'profile' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                My Profile
              </button>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.activeTabBtn : ''}`}
                onClick={() => setActiveTab('orders')}
              >
                My Orders {orders.length > 0 && `(${orders.length})`}
              </button>
            </nav>

            {activeTab === 'profile' ? (
              /* TAB 1: PROFILE */
              <>
                <div className={styles.tabActionRow}>
                  <button
                    type="button"
                    className={styles.pageLinkBtn}
                    onClick={() => {
                      onClose()
                      onNavigate?.('profile')
                    }}
                  >
                    Open Full Profile Page ↗
                  </button>
                </div>

                {/* Profile Overview Card */}
                <div className={styles.profileCard}>
                  <div className={styles.avatarWrap}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className={styles.avatarImg} />
                    ) : (
                      <div className={styles.avatarPlaceholder}>
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className={styles.profileText}>
                    <h3 className={styles.profileName}>{displayName}</h3>
                    <p className={styles.profileEmail}>{displayEmail}</p>
                    <span className={styles.authBadge}>✓ Google Verified Account</span>
                  </div>
                </div>

                <div className={styles.divider} />

                {/* Voluntary Profile Details (Age, Gender) */}
                <form onSubmit={handleSaveProfile} className={styles.profileForm}>
                  <h4 className={styles.formTitle}>Voluntary Profile Details</h4>
                  <p className={styles.formSubtext}>
                    Optionally complete your personal preferences for customized curation.
                  </p>

                  <div className={styles.formRow}>
                    <div className={styles.inputGroup}>
                      <label htmlFor="user-age" className={styles.label}>
                        Age (Optional)
                      </label>
                      <input
                        id="user-age"
                        type="number"
                        min="16"
                        max="110"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        placeholder="e.g. 28"
                        className={styles.input}
                      />
                    </div>

                    <div className={styles.inputGroup}>
                      <label htmlFor="user-gender" className={styles.label}>
                        Gender (Optional)
                      </label>
                      <select
                        id="user-gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className={styles.select}
                      >
                        <option value="">Select (Optional)</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Non-Binary">Non-Binary</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      type="submit"
                      className={styles.saveBtn}
                      disabled={savingProfile}
                    >
                      {savingProfile ? 'Saving…' : saveSuccess ? 'Saved Successfully ✓' : 'Save Profile Preferences'}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              /* TAB 2: ORDERS */
              <div className={styles.ordersSection}>
                <div className={styles.tabActionRow}>
                  <button
                    type="button"
                    className={styles.pageLinkBtn}
                    onClick={() => {
                      onClose()
                      onNavigate?.('orders')
                    }}
                  >
                    Open Full Orders Page ↗
                  </button>
                </div>

                {ordersLoading ? (
                  <p style={{ color: 'rgba(245, 237, 214, 0.7)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    Loading orders from Supabase…
                  </p>
                ) : orders.length === 0 ? (
                  <p style={{ color: 'rgba(245, 237, 214, 0.7)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                    No orders placed yet.
                  </p>
                ) : (
                  <div className={styles.ordersList}>
                    {orders.map((ord) => (
                      <div key={ord.id} className={styles.orderCard}>
                        <div className={styles.orderTop}>
                          <span className={styles.orderNumber}>{ord.orderNumber}</span>
                          <span className={`${styles.orderStatusBadge} ${getStatusBadgeClass(ord.orderStatus)}`}>
                            ● {ord.orderStatus}
                          </span>
                        </div>

                        {/* Order Line Items */}
                        {ord.items && ord.items.length > 0 && (
                          <div className={styles.modalItemsList}>
                            {ord.items.map((item, idx) => (
                              <div key={item.id || idx} className={styles.modalItemRow}>
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className={styles.modalItemThumb}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null
                                    e.currentTarget.src = '/images/products/royal-maroon.jpg'
                                  }}
                                />
                                <div className={styles.modalItemDetails}>
                                  <div className={styles.modalItemName}>{item.name}</div>
                                  <div className={styles.modalItemMeta}>
                                    Qty: {item.quantity} • ₹{item.price.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className={styles.orderBottom}>
                          <span>
                            {ord.formattedDate} • {ord.paymentMethod}
                          </span>
                          <span className={styles.orderAmount}>
                            ₹{ord.totalAmount?.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={styles.divider} style={{ margin: '20px 0 16px' }} />

            {/* Logout Action */}
            <div className={styles.footerRow}>
              <button
                type="button"
                className={styles.logoutBtn}
                onClick={async () => {
                  await signOut()
                  onClose()
                }}
              >
                Sign Out
              </button>

              <button
                type="button"
                className={styles.returnBtn}
                onClick={onClose}
              >
                Return to Shopping
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 5c1.7 0 3 .6 4 1.5l3-3C17.2 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
      />
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.8c-.3-.8-.4-1.8-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
      />
      <path
        fill="#34A853"
        d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.1 7.5 23 12 23z"
      />
    </svg>
  )
}

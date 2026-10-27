import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './AdminLayout'
import DashboardView from './DashboardView'
import ProductsManager from './ProductsManager'
import OrdersManager from './OrdersManager'
import UsersManager from './UsersManager'
import BestSellersManager from './BestSellersManager'
import ReviewsManager from './ReviewsManager'
import SettingsView from './SettingsView'
import styles from './AdminPortal.module.css'

export default function AdminPortal({ onBack }) {
  const [activeTab, setActiveTab] = useState('dashboard') // 'dashboard' | 'products' | 'orders' | 'users' | 'bestsellers' | 'settings'
  const { user, profile, isAuthenticated, isAdmin, signInWithGoogle, signOut } = useAuth()

  // Guard: if user is not authenticated or not an admin
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className={styles.portal}>
        <div className={styles.inner}>
          <div className={styles.gateContainer}>
            <div className={styles.gateCard}>
              <div className={styles.gateIcon}>
                <ShieldLockIcon />
              </div>
              <h1 className={styles.gateTitle}>Administrator Access Required</h1>
              <p className={styles.gateDesc}>
                {isAuthenticated ? (
                  <>
                    You are signed in as <strong>{user?.email}</strong>. This account does not possess
                    Administrator privileges for the AURA luxury console.
                  </>
                ) : (
                  <>
                    The AURA Administrative Portal is strictly restricted to authenticated store
                    managers and atelier curators.
                  </>
                )}
              </p>

              {!isAuthenticated ? (
                <button
                  type="button"
                  className={styles.gateActionBtn}
                  onClick={() => signInWithGoogle?.()}
                >
                  Sign In with Google Admin Account
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.gateSecondaryBtn}
                  onClick={() => signOut?.()}
                >
                  Sign Out of Current Account
                </button>
              )}

              <button
                type="button"
                className={styles.gateSecondaryBtn}
                onClick={() => onBack?.()}
              >
                ← Return to Boutique
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AdminLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onBackToStore={onBack}
      adminUser={user}
      adminProfile={profile}
    >
      {activeTab === 'dashboard' && (
        <DashboardView onNavigateTab={setActiveTab} />
      )}
      {activeTab === 'products' && <ProductsManager />}
      {activeTab === 'orders' && <OrdersManager />}
      {activeTab === 'users' && <UsersManager />}
      {activeTab === 'bestsellers' && <BestSellersManager />}
      {activeTab === 'reviews' && <ReviewsManager />}
      {activeTab === 'settings' && <SettingsView />}
    </AdminLayout>
  )
}

function ShieldLockIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <rect x="9" y="11" width="6" height="5" rx="1" />
      <path d="M10 11V9a2 2 0 1 1 4 0v2" />
    </svg>
  )
}

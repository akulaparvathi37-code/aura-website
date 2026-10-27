import { useState } from 'react'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon },
  { id: 'products', label: 'Products', icon: ProductsIcon },
  { id: 'orders', label: 'Orders', icon: OrdersIcon },
  { id: 'users', label: 'Users', icon: UsersIcon },
  { id: 'bestsellers', label: 'Best Sellers', icon: StarIcon },
  { id: 'reviews', label: 'Reviews', icon: ReviewsIcon },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

export default function AdminLayout({
  activeTab,
  onSelectTab,
  onBackToStore,
  adminUser,
  adminProfile,
  children,
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const adminName =
    adminProfile?.name || adminUser?.user_metadata?.full_name || adminUser?.email || 'AURA Curator'
  const avatarUrl = adminProfile?.avatar_url || adminUser?.user_metadata?.avatar_url

  const handleTabClick = (tabId) => {
    onSelectTab?.(tabId)
    setMobileSidebarOpen(false)
  }

  const currentTabLabel =
    NAV_ITEMS.find((item) => item.id === activeTab)?.label || 'Console'

  return (
    <div className={styles.layout}>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`${styles.sidebar} ${
          mobileSidebarOpen ? styles.sidebarOpen : ''
        }`}
        aria-label="Admin Navigation"
      >
        {/* Brand header */}
        <div className={styles.sidebarHeader}>
          <a
            href="/"
            className={styles.brandLink}
            onClick={(e) => {
              e.preventDefault()
              onBackToStore?.()
            }}
          >
            <span className={styles.brandLogo}>AURA</span>
            <span className={styles.brandSub}>Atelier Console</span>
          </a>

          <button
            type="button"
            className={styles.closeSidebarBtn}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        {/* Navigation items */}
        <nav className={styles.navMenu}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${
                  isActive ? styles.navItemActive : ''
                }`}
                onClick={() => handleTabClick(item.id)}
              >
                <Icon className={styles.navIcon} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={styles.sidebarFooter}>
          <div className={styles.profileChip}>
            {avatarUrl ? (
              <img src={avatarUrl} alt={adminName} className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {adminName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className={styles.profileInfo}>
              <span className={styles.profileName} title={adminName}>
                {adminName}
              </span>
              <span className={styles.profileRole}>Administrator</span>
            </div>
          </div>

          <button
            type="button"
            className={styles.backStoreBtn}
            onClick={onBackToStore}
          >
            ← Back to Boutique
          </button>
        </div>
      </aside>

      {/* Main Content Workspace */}
      <div className={styles.mainArea}>
        {/* Top bar */}
        <header className={styles.topNav}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className={styles.mobileMenuBtn}
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <MenuIcon />
            </button>

            <div className={styles.breadcrumb}>
              <span>AURA</span>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbActive}>{currentTabLabel}</span>
            </div>
          </div>

          <div className={styles.topPill}>
            <span className={styles.pulseDot} />
            <span>Supabase Production Live</span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className={styles.pageBody}>{children}</main>
      </div>
    </div>
  )
}

/* ---------- SVG Icons ---------- */
function DashboardIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  )
}

function ProductsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  )
}

function OrdersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  )
}

function UsersIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function StarIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function ReviewsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  )
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

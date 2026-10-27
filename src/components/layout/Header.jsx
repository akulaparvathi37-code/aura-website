import { useState, useEffect } from 'react'
import { useWishlist } from '../../context/WishlistContext'
import { useAuth } from '../../context/AuthContext'
import { useCart } from '../../context/CartContext'
import styles from './Header.module.css'

// Section 1: Hero navigation - Removed 'Dresses', 'Men', 'Collections', 'Gifts', kept Saree-related options
const NAV_LINKS = ['New In', 'Sarees', 'Lehengas']

export default function Header({
  currentPage = 'home',
  onNavigate,
  onOpenSearch,
  onOpenAuth,
  onOpenCart,
}) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { count: wishlistCount } = useWishlist()
  const { user, profile, isAuthenticated, isAdmin } = useAuth()
  const { totalCount: cartCount } = useCart()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleLinkClick = (e, link) => {
    if (link === 'Sarees') {
      e.preventDefault()
      onNavigate?.('sarees')
    } else if (link === 'Lehengas') {
      e.preventDefault()
      onNavigate?.('lehengas')
    } else if (currentPage !== 'home') {
      onNavigate?.('home')
    }
  }

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const userName = profile?.name || user?.user_metadata?.full_name || user?.email

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`} role="banner">
      <div className={styles.inner}>
        {/* Mobile menu toggle button */}
        <button
          type="button"
          className={styles.mobileMenuToggle}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        {/* Logo */}
        <a
          href="/"
          className={styles.logo}
          aria-label="AURA — Luxury Indian Sarees"
          onClick={(e) => {
            e.preventDefault()
            onNavigate?.('home')
          }}
        >
          AURA
        </a>

        {/* Desktop Navigation */}
        <nav className={styles.nav} aria-label="Main navigation">
          <ul className={styles.navList} role="list">
            {NAV_LINKS.map((link) => {
              const isActive =
                (link === 'Sarees' && currentPage === 'sarees') ||
                (link === 'Lehengas' && currentPage === 'lehengas')
              const href =
                link === 'Sarees'
                  ? '#sarees'
                  : link === 'Lehengas'
                  ? '#lehengas'
                  : `#${link.toLowerCase().replace(/\s+/g, '-')}`

              return (
                <li key={link}>
                  <a
                    href={href}
                    className={`${styles.navLink} ${isActive ? styles.activeLink : ''}`}
                    onClick={(e) => handleLinkClick(e, link)}
                  >
                    {link}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Action icons */}
        <div className={styles.actions} role="group" aria-label="User actions">
          {/* Section 2: Search button */}
          <button
            type="button"
            className={styles.iconBtn}
            aria-label="Search sarees"
            title="Search sarees"
            onClick={onOpenSearch}
          >
            <SearchIcon />
          </button>

          {/* Account / Login button */}
          <button
            type="button"
            className={`${styles.iconBtn} ${isAuthenticated ? styles.activeAccountBtn : ''}`}
            aria-label={isAuthenticated ? `Account (${userName})` : 'Sign in to account'}
            title={isAuthenticated ? `Account: ${userName}` : 'Sign In with Google'}
            onClick={onOpenAuth}
          >
            {isAuthenticated && avatarUrl ? (
              <img src={avatarUrl} alt={userName} className={styles.headerAvatar} />
            ) : (
              <AccountIcon />
            )}
            {isAuthenticated && <span className={styles.onlineDot} />}
          </button>

          {/* Section 5: Liked / Wishlist button */}
          <button
            type="button"
            className={`${styles.iconBtn} ${currentPage === 'wishlist' ? styles.activeIconBtn : ''}`}
            aria-label={`Wishlist (${wishlistCount} liked)`}
            title="View Liked Sarees"
            onClick={() => onNavigate?.('wishlist')}
          >
            <WishlistIcon />
            {wishlistCount > 0 && <span className={styles.badge}>{wishlistCount}</span>}
          </button>

          <button
            type="button"
            className={`${styles.iconBtn} ${cartCount > 0 ? styles.activeIconBtn : ''}`}
            aria-label={`Shopping bag (${cartCount} items)`}
            title="View Shopping Bag"
            onClick={onOpenCart}
          >
            <BagIcon />
            {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
          </button>

          {/* Admin Console Shortcut */}
          {isAdmin && (
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.adminIconBtn} ${
                currentPage === 'admin' ? styles.activeIconBtn : ''
              }`}
              aria-label="AURA Admin Portal"
              title="AURA Admin Portal"
              onClick={() => onNavigate?.('admin')}
            >
              <AdminBadgeIcon />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav className={styles.mobileNav} aria-label="Mobile navigation">
          <ul className={styles.mobileNavList} role="list">
            {NAV_LINKS.map((link) => (
              <li key={link}>
                <a
                  href={
                    link === 'Sarees'
                      ? '#sarees'
                      : link === 'Lehengas'
                      ? '#lehengas'
                      : `#${link.toLowerCase().replace(/\s+/g, '-')}`
                  }
                  className={styles.mobileNavLink}
                  onClick={(e) => {
                    setMobileMenuOpen(false)
                    handleLinkClick(e, link)
                  }}
                >
                  {link}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#wishlist"
                className={styles.mobileNavLink}
                onClick={(e) => {
                  e.preventDefault()
                  setMobileMenuOpen(false)
                  onNavigate?.('wishlist')
                }}
              >
                Liked Sarees ({wishlistCount})
              </a>
            </li>
            <li>
              <button
                type="button"
                className={styles.mobileNavBtn}
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenCart?.()
                }}
              >
                Shopping Bag ({cartCount})
              </button>
            </li>
            <li>
              <button
                type="button"
                className={styles.mobileNavBtn}
                onClick={() => {
                  setMobileMenuOpen(false)
                  onOpenAuth?.()
                }}
              >
                {isAuthenticated ? `Account: ${userName}` : 'Sign In with Google'}
              </button>
            </li>
            {isAuthenticated && (
              <>
                <li>
                  <button
                    type="button"
                    className={styles.mobileNavBtn}
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onNavigate?.('orders')
                    }}
                  >
                    My Orders 🛍
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={styles.mobileNavBtn}
                    onClick={() => {
                      setMobileMenuOpen(false)
                      onNavigate?.('profile')
                    }}
                  >
                    My Profile 👤
                  </button>
                </li>
              </>
            )}
            {isAdmin && (
              <li>
                <button
                  type="button"
                  className={styles.mobileNavBtn}
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onNavigate?.('admin')
                  }}
                  style={{ color: '#c9a84c', fontWeight: 600 }}
                >
                  Admin Console ⚙
                </button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}

function AdminBadgeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polygon points="12 8 13.5 11 17 11.5 14.5 14 15 17.5 12 16 9 17.5 9.5 14 7 11.5 10.5 11 12 8" />
    </svg>
  )
}

/* ---------- SVG Icons ---------- */
function SearchIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function AccountIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21v-1.8a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4V21" />
      <circle cx="12" cy="7" r="3.8" />
    </svg>
  )
}

function WishlistIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function BagIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3 3 7v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7l-3-4z" />
      <line x1="3" y1="7" x2="21" y2="7" />
      <path d="M16 11a4 4 0 0 1-8 0" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

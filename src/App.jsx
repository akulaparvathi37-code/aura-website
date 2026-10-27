import { useState, useEffect } from 'react'
import { WishlistProvider } from './context/WishlistContext'
import { AuthProvider } from './context/AuthContext'
import { CartProvider, useCart } from './context/CartContext'
import Header from './components/layout/Header'
import HeroSection from './components/sections/HeroSection'
import SixMoodsSection from './components/sections/SixMoodsSection'
import WovenSection from './components/sections/WovenSection'
import BestSellersSection from './components/sections/BestSellersSection'
import OccasionsSection from './components/sections/OccasionsSection'
import ReviewsSection from './components/sections/ReviewsSection'
import ReviewModal from './components/reviews/ReviewModal'
import SareesCollectionPage from './pages/SareesCollectionPage'
import LehengasCollectionPage from './pages/LehengasCollectionPage'
import WishlistPage from './pages/WishlistPage'
import MyOrdersPage from './pages/MyOrdersPage'
import MyProfilePage from './pages/MyProfilePage'
import SareeSearchModal from './components/search/SareeSearchModal'
import SareeDetailModal from './components/collection/SareeDetailModal'
import AuthModal from './components/auth/AuthModal'
import CartDrawer from './components/cart/CartDrawer'
import CheckoutModal from './components/checkout/CheckoutModal'
import AdminPortal from './components/admin/AdminPortal'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <AuraAppContent />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  )
}

const VALID_HOME_SECTIONS = new Set([
  '#new-in',
  '#woven',
  '#six-moods',
  '#moods',
  '#best-sellers',
  '#occasions',
  '#reviews',
  '#hero',
  '#collection',
  '#heritage',
  '#stories',
  '#contact',
  '#faq',
  '#footer',
])

function resolveAppRoute() {
  if (typeof window === 'undefined') return { page: 'home', openCheckout: false }

  const pathname = (window.location.pathname || '/').replace(/\/+$/, '').toLowerCase() || '/'
  const hash = (window.location.hash || '').toLowerCase()
  const search = (window.location.search || '').toLowerCase()

  // 1. Supabase OAuth callback handling (hash tokens, PKCE code, or callback pathnames)
  if (
    hash.includes('access_token') ||
    hash.includes('refresh_token') ||
    hash.includes('error=') ||
    search.includes('code=') ||
    search.includes('error=') ||
    pathname === '/auth/callback' ||
    pathname === '/callback'
  ) {
    return { page: 'home', openCheckout: false }
  }

  // 2. Check pathnames first (if not root or index.html)
  if (pathname !== '/' && pathname !== '/index.html') {
    if (pathname === '/admin') return { page: 'admin', openCheckout: false }
    if (pathname === '/sarees') return { page: 'sarees', openCheckout: false }
    if (pathname === '/lehengas') return { page: 'lehengas', openCheckout: false }
    if (pathname === '/wishlist' || pathname === '/liked') return { page: 'wishlist', openCheckout: false }
    if (pathname === '/orders') return { page: 'orders', openCheckout: false }
    if (pathname === '/profile') return { page: 'profile', openCheckout: false }
    if (pathname === '/checkout') return { page: 'home', openCheckout: true }

    // Any other pathname is an invalid route -> 404!
    return { page: '404', openCheckout: false }
  }

  // 3. When pathname is root ('/' or '/index.html'), check hash
  if (!hash || hash === '#' || hash === '#/') {
    return { page: 'home', openCheckout: false }
  }

  // Hash-based routes
  if (hash === '#admin') return { page: 'admin', openCheckout: false }
  if (hash === '#sarees') return { page: 'sarees', openCheckout: false }
  if (hash === '#lehengas') return { page: 'lehengas', openCheckout: false }
  if (hash === '#wishlist' || hash === '#liked') return { page: 'wishlist', openCheckout: false }
  if (hash === '#orders') return { page: 'orders', openCheckout: false }
  if (hash === '#profile') return { page: 'profile', openCheckout: false }
  if (hash === '#checkout') return { page: 'home', openCheckout: true }

  // Valid homepage sections
  if (VALID_HOME_SECTIONS.has(hash)) {
    return { page: 'home', openCheckout: false }
  }

  // Any other unrecognized hash -> 404!
  return { page: '404', openCheckout: false }
}

function AuraAppContent() {
  const [currentPage, setCurrentPage] = useState(() => resolveAppRoute().page)

  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(() => resolveAppRoute().openCheckout)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [reviewTargetProduct, setReviewTargetProduct] = useState(null)
  const [activeModalSaree, setActiveModalSaree] = useState(null)
  const { isCartOpen, openCart, closeCart } = useCart()

  useEffect(() => {
    const handleRouteChange = () => {
      const { page, openCheckout } = resolveAppRoute()
      if (openCheckout) {
        setIsCheckoutOpen(true)
      }
      setCurrentPage(page)
      window.scrollTo({ top: 0, behavior: 'instant' })
    }

    window.addEventListener('hashchange', handleRouteChange)
    window.addEventListener('popstate', handleRouteChange)
    return () => {
      window.removeEventListener('hashchange', handleRouteChange)
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [])

  const navigateTo = (page) => {
    setCurrentPage(page)
    const hasPathname = window.location.pathname !== '/' && window.location.pathname !== '/index.html'

    if (page === 'admin') {
      if (hasPathname) history.pushState(null, '', '/#admin')
      window.location.hash = 'admin'
    } else if (page === 'sarees') {
      if (hasPathname) history.pushState(null, '', '/#sarees')
      window.location.hash = 'sarees'
    } else if (page === 'lehengas') {
      if (hasPathname) history.pushState(null, '', '/#lehengas')
      window.location.hash = 'lehengas'
    } else if (page === 'wishlist') {
      if (hasPathname) history.pushState(null, '', '/#wishlist')
      window.location.hash = 'wishlist'
    } else if (page === 'orders') {
      if (hasPathname) history.pushState(null, '', '/#orders')
      window.location.hash = 'orders'
    } else if (page === 'profile') {
      if (hasPathname) history.pushState(null, '', '/#profile')
      window.location.hash = 'profile'
    } else if (page === 'home') {
      if (hasPathname || window.location.hash) {
        history.pushState(null, '', '/')
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  return (
    <div className="aura-app">
      <Header
        currentPage={currentPage}
        onNavigate={navigateTo}
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCart={openCart}
      />

      {currentPage === 'admin' ? (
        <AdminPortal onBack={() => navigateTo('home')} onNavigate={navigateTo} />
      ) : currentPage === 'sarees' ? (
        <SareesCollectionPage
          onBack={() => navigateTo('home')}
          onSelectSaree={(saree) => setActiveModalSaree(saree)}
        />
      ) : currentPage === 'lehengas' ? (
        <LehengasCollectionPage onBack={() => navigateTo('home')} />
      ) : currentPage === 'wishlist' ? (
        <WishlistPage
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo}
          onSelectSaree={(saree) => setActiveModalSaree(saree)}
        />
      ) : currentPage === 'orders' ? (
        <MyOrdersPage
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      ) : currentPage === 'profile' ? (
        <MyProfilePage
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
      ) : currentPage === '404' ? (
        <NotFoundPage
          onBack={() => navigateTo('home')}
          onNavigate={navigateTo}
        />
      ) : (
        <main>
          <HeroSection onNavigate={navigateTo} />
          <SixMoodsSection onNavigate={navigateTo} />
          <WovenSection onNavigate={navigateTo} />
          <BestSellersSection onNavigate={navigateTo} />
          <OccasionsSection onNavigate={navigateTo} />
          <ReviewsSection
            onOpenReview={() => {
              setReviewTargetProduct(null)
              setIsReviewOpen(true)
            }}
          />
        </main>
      )}

      {/* Saree Search Modal */}
      <SareeSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectSaree={(saree) => setActiveModalSaree(saree)}
      />

      {/* Global Saree Detail Modal */}
      {activeModalSaree && (
        <SareeDetailModal
          saree={activeModalSaree}
          onClose={() => setActiveModalSaree(null)}
        />
      )}

      {/* Google Auth / Account Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onNavigate={navigateTo}
      />

      {/* Shopping Bag / Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={closeCart}
        onNavigateToShop={() => navigateTo('sarees')}
        onProceedToCheckout={() => {
          closeCart()
          setIsCheckoutOpen(true)
        }}
      />

      {/* Luxury Checkout & Razorpay Payment Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => {
          setIsCheckoutOpen(false)
          if (window.location.hash === '#checkout') {
            history.pushState(null, '', window.location.pathname)
          }
        }}
        onNavigateToHome={() => navigateTo('home')}
        onNavigateToOrders={() => navigateTo('orders')}
        onOpenReview={(item) => {
          setIsCheckoutOpen(false)
          setReviewTargetProduct(item)
          setIsReviewOpen(true)
        }}
      />

      {/* Patron Experience / Review Modal */}
      <ReviewModal
        isOpen={isReviewOpen}
        onClose={() => setIsReviewOpen(false)}
        preselectedProduct={reviewTargetProduct}
        isVerified={Boolean(reviewTargetProduct)}
      />
    </div>
  )
}

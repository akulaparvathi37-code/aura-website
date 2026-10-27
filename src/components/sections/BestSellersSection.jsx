import { useState, useRef, useEffect, useCallback } from 'react'
import { gsap } from 'gsap'
import { PRODUCTS } from '../../data/products'
import { getBestSellerProducts } from '../../lib/admin/adminService'
import { supabase } from '../../lib/supabase/client'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import ProductShelfRow from '../products/ProductShelfRow'
import ProductQuickViewModal from '../products/ProductQuickViewModal'
import styles from './BestSellersSection.module.css'

export default function BestSellersSection({ onNavigate }) {
  const { isLiked, toggleWishlist } = useWishlist()
  const [products, setProducts] = useState(PRODUCTS)
  const [bagItems, setBagItems] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [activeProductId, setActiveProductId] = useState(null)
  const [toastMessage, setToastMessage] = useState(null)
  const { addToCart } = useCart()

  const handleSelectProduct = useCallback((product) => {
    setActiveProductId(product?.id || null)
  }, [])

  // Load dynamic best sellers from Supabase and subscribe to changes
  useEffect(() => {
    let isMounted = true

    const loadDynamicBestSellers = async () => {
      try {
        const dynamicList = await getBestSellerProducts()
        if (isMounted && dynamicList && dynamicList.length > 0) {
          setProducts(dynamicList)
        }
      } catch (err) {
        console.warn('Fallback to local best sellers:', err)
      }
    }

    loadDynamicBestSellers()

    const channel = supabase
      .channel('public:best_sellers_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'best_sellers' },
        () => {
          loadDynamicBestSellers()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const sectionRef = useRef(null)
  const headerRef = useRef(null)
  const rowsRef = useRef(null)
  const toastTimeoutRef = useRef(null)

  // Toast trigger
  const showToast = useCallback((msg) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current)
    setToastMessage(msg)
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null)
    }, 2400)
  }, [])

  // Wishlist toggle
  const handleToggleWishlist = useCallback((product) => {
    const wasLiked = isLiked(product.id)
    toggleWishlist(product.id)
    showToast(wasLiked ? `Removed from Wishlist: ${product.name}` : `Added to Wishlist: ${product.name}`)
  }, [isLiked, toggleWishlist, showToast])

  // Add to Bag
  const handleAddToCart = useCallback((product) => {
    addToCart(product, 1)
    setBagItems((prev) => [...prev, product])
    showToast(`Added to Bag: ${product.name}`)
  }, [addToCart, showToast])

  // GSAP Viewport Entrance Animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

            if (headerRef.current) {
              tl.fromTo(
                headerRef.current.children,
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 },
                0
              )
            }

            if (rowsRef.current) {
              tl.fromTo(
                rowsRef.current.children,
                { opacity: 0, y: 30 },
                { opacity: 1, y: 0, duration: 0.8, stagger: 0.18 },
                0.2
              )
            }
          }, sectionRef)

          observer.disconnect()
        }
      },
      { threshold: 0.12 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="best-sellers"
      aria-label="Best Sellers — Featured Handcrafted Saree Collection"
    >
      <div className={styles.container}>
        {/* Header Row */}
        <div ref={headerRef} className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <span className={styles.eyebrow}>— FEATURED COLLECTION</span>
            <h2 className={styles.heading}>Best Sellers</h2>
          </div>

          <div className={styles.headerRight}>
            <a
              href="#lehengas"
              className={styles.viewAllLink}
              onClick={(e) => {
                e.preventDefault()
                if (onNavigate) {
                  onNavigate('lehengas')
                } else {
                  window.location.hash = '#lehengas'
                }
              }}
            >
              <span>View All</span>
              <span className={styles.viewAllArrow} aria-hidden="true">→</span>
            </a>
          </div>
        </div>

        {/* Dual Opposite Scrolling Rows Container */}
        <div ref={rowsRef} className={styles.rowsContainer}>
          {/* ROW 1: Original Section 4 — Scrolls RIGHT */}
          <ProductShelfRow
            direction="right"
            products={products}
            isLiked={isLiked}
            activeProductId={activeProductId}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onProductClick={setSelectedProduct}
            initialOffset={0}
          />

          {/* ROW 2: Duplicated Section 4 — Scrolls LEFT */}
          <ProductShelfRow
            direction="left"
            products={products}
            isLiked={isLiked}
            activeProductId={activeProductId}
            onSelectProduct={handleSelectProduct}
            onToggleWishlist={handleToggleWishlist}
            onAddToCart={handleAddToCart}
            onProductClick={setSelectedProduct}
            initialOffset={3}
          />
        </div>
      </div>

      {/* Quick View Modal */}
      {selectedProduct && (
        <ProductQuickViewModal
          product={selectedProduct}
          isWishlisted={isLiked(selectedProduct.id)}
          onToggleWishlist={handleToggleWishlist}
          onAddToCart={handleAddToCart}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Interactive Toast Notification */}
      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcon}>✦</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </section>
  )
}

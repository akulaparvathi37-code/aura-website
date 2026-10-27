import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { useWishlist } from '../../context/WishlistContext'
import styles from './MoodProductPreview.module.css'

export default function MoodProductPreview({ mood, onClose }) {
  const containerRef = useRef(null)
  const product = mood?.product
  const { isLiked, toggleWishlist } = useWishlist()
  const liked = isLiked(product?.id)

  useEffect(() => {
    if (!containerRef.current) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        containerRef.current,
        { opacity: 0, y: 24, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'power3.out' }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [mood?.id])

  if (!product) return null

  return (
    <div ref={containerRef} className={styles.previewContainer} role="region" aria-label={`Featured look: ${mood.title}`}>
      <div className={styles.previewCard}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close product preview"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.grid}>
          {/* Product Image */}
          <div className={styles.imageColumn}>
            <div className={styles.imageFrame}>
              <img
                src={product.image}
                alt={product.name}
                className={styles.productImg}
              />
              <span className={styles.tagBadge}>{product.tag}</span>
            </div>
          </div>

          {/* Product Details */}
          <div className={styles.infoColumn}>
            <p className={styles.categoryLabel}>{mood.title}</p>
            <h4 className={styles.productName}>{product.name}</h4>

            <div className={styles.priceRow}>
              <span className={styles.currentPrice}>{product.price}</span>
              {product.originalPrice && (
                <span className={styles.originalPrice}>{product.originalPrice}</span>
              )}
            </div>

            <p className={styles.description}>{product.description}</p>

            <div className={styles.metaList}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Color & Finish:</span>
                <span className={styles.metaValue}>{product.color}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Fabric:</span>
                <span className={styles.metaValue}>{product.fabric}</span>
              </div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={`btn-pill ${styles.shopCta}`}>
                <span>Shop This Look</span>
                <span>→</span>
              </button>
              <button
                type="button"
                className={`${styles.wishlistBtn} ${liked ? styles.wishlistActive : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  if (product?.id) toggleWishlist(product.id)
                }}
                aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={liked}
                title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={liked ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

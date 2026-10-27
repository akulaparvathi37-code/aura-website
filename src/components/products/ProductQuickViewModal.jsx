import { useState, useEffect } from 'react'
import styles from './ProductQuickViewModal.module.css'

export default function ProductQuickViewModal({
  product,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onClose,
}) {
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!product) return null

  const handleAdd = () => {
    setAdded(true)
    for (let i = 0; i < qty; i++) {
      onAddToCart(product)
    }
    setTimeout(() => {
      setAdded(false)
      onClose()
    }, 700)
  }

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

        {/* Left Side: Product High-Res Image */}
        <div className={styles.imageSide}>
          <img
            src={product.image || '/images/products/royal-maroon.jpg'}
            alt={product.name}
            className={styles.productImg}
            onError={(e) => {
              e.currentTarget.onerror = null
              e.currentTarget.src = '/images/products/royal-maroon.jpg'
            }}
          />
        </div>

        {/* Right Side: Specifications & Order Actions */}
        <div className={styles.contentSide}>
          <span className={styles.eyebrow}>{product.category} COLLECTION</span>
          <h3 className={styles.title}>{product.name}</h3>

          <div className={styles.ratingRow}>
            <span className={styles.stars}>★★★★★</span>
            <span className={styles.reviewCount}>({product.reviewsCount} customer reviews)</span>
          </div>

          <div className={styles.priceRow}>
            <span className={styles.price}>{product.price}</span>
            {product.originalPrice && (
              <span className={styles.originalPrice}>{product.originalPrice}</span>
            )}
            <span className={styles.discountBadge}>Special Festive Offer</span>
          </div>

          <p className={styles.description}>{product.description}</p>

          <div className={styles.specsGrid}>
            <div>
              <div className={styles.specLabel}>Fabric & Weave</div>
              <div className={styles.specValue}>{product.fabric}</div>
            </div>
            <div>
              <div className={styles.specLabel}>Origin & Craft</div>
              <div className={styles.specValue}>{product.origin}</div>
            </div>
            <div>
              <div className={styles.specLabel}>Artisan Time</div>
              <div className={styles.specValue}>{product.craftTime}</div>
            </div>
            <div>
              <div className={styles.specLabel}>Blouse Piece</div>
              <div className={styles.specValue}>{product.blouse}</div>
            </div>
          </div>

          <div className={styles.actionRow}>
            <div className={styles.qtyControl}>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => setQty(Math.max(1, qty - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className={styles.qtyValue}>{qty}</span>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => setQty(qty + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              type="button"
              className={styles.addBtn}
              onClick={handleAdd}
            >
              {added ? '✓ Added to Bag' : 'Add to Shopping Bag'}
            </button>

            <button
              type="button"
              className={`${styles.wishlistModalBtn} ${isWishlisted ? styles.wishlistActive : ''}`}
              onClick={() => onToggleWishlist(product)}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={isWishlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import styles from './ProductCard.module.css'

export default function ProductCard({
  product,
  isActive,
  isWishlisted,
  onToggleWishlist,
  onAddToCart,
  onSelect,
  onQuickView,
}) {
  const [justAdded, setJustAdded] = useState(false)

  const handleAdd = (e) => {
    e.stopPropagation()
    setJustAdded(true)
    onAddToCart?.(product)
    setTimeout(() => setJustAdded(false), 900)
  }

  const handleWishlist = (e) => {
    e.stopPropagation()
    onToggleWishlist?.(product)
  }

  const handleCardClick = () => {
    if (onSelect) {
      onSelect(product)
    } else {
      onQuickView?.(product)
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isActive ? styles.cardActive : ''}`}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleCardClick()
        }
      }}
      aria-label={`View details for ${product.name}`}
      aria-pressed={isActive}
    >
      {/* Product Image Frame */}
      <div className={styles.imageContainer}>
        <img
          src={product.image || '/images/products/royal-maroon.jpg'}
          alt={product.name}
          className={styles.image}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = '/images/products/royal-maroon.jpg'
          }}
        />
        <div className={styles.imageGradient} aria-hidden="true" />

        {/* Wishlist Heart Icon Button */}
        <button
          type="button"
          className={`${styles.wishlistBtn} ${isWishlisted ? styles.wishlistActive : ''}`}
          onClick={handleWishlist}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
        >
          <svg
            className={styles.wishlistIcon}
            viewBox="0 0 24 24"
            fill={isWishlisted ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Quick View Hover Badge */}
        <span
          className={styles.quickViewBadge}
          onClick={(e) => {
            e.stopPropagation()
            onQuickView?.(product)
          }}
          aria-hidden="true"
        >
          Quick View
        </span>

        {/* Active Pill Badge */}
        {isActive && (
          <div className={styles.activeBadge} aria-hidden="true">
            <span className={styles.activeDot} />
            Selected
          </div>
        )}
      </div>

      {/* Details Box */}
      <div className={styles.details}>
        <h4 className={styles.name} title={product.name}>
          {product.name}
        </h4>

        <div className={styles.priceRow}>
          <span className={styles.price}>{product.price}</span>
          {product.originalPrice && (
            <span className={styles.originalPrice}>{product.originalPrice}</span>
          )}
        </div>

        <div className={styles.metaRow}>
          <div className={styles.rating} aria-label={`${product.rating} out of 5 stars from ${product.reviewsCount} reviews`}>
            <span className={styles.stars} aria-hidden="true">★★★★★</span>
            <span className={styles.reviewCount}>({product.reviewsCount})</span>
          </div>

          {/* Quick Add to Bag Button */}
          <button
            type="button"
            className={`${styles.bagBtn} ${justAdded ? styles.bagBtnAdded : ''}`}
            onClick={handleAdd}
            aria-label={`Add ${product.name} to shopping bag`}
            title={justAdded ? 'Added to Bag!' : 'Add to Bag'}
          >
            {justAdded ? (
              <svg className={styles.bagIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg className={styles.bagIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

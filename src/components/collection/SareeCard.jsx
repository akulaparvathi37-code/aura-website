import { useState } from 'react'
import { useWishlist } from '../../context/WishlistContext'
import { useCart } from '../../context/CartContext'
import styles from './SareeCard.module.css'

export default function SareeCard({ saree, onSelect }) {
  const [added, setAdded] = useState(false)
  const { isLiked, toggleWishlist } = useWishlist()
  const { addToCart } = useCart()
  const liked = isLiked(saree.id)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart(saree, 1, 'Pure Silk with Blouse')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  const handleCardClick = () => {
    onSelect?.(saree)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onSelect?.(saree)
    }
  }

  return (
    <article
      className={`${styles.card} ${onSelect ? styles.clickableCard : ''}`}
      aria-label={saree.name}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      tabIndex={onSelect ? 0 : undefined}
      role={onSelect ? 'button' : undefined}
    >
      {/* Generated Saree Image */}
      <div className={styles.imageWrap}>
        <img
          src={saree.image || '/images/products/royal-maroon.jpg'}
          alt={saree.name}
          className={styles.image}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = '/images/products/royal-maroon.jpg'
          }}
        />

        {/* Wishlist / Like Button */}
        <button
          type="button"
          className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            toggleWishlist(saree.id)
          }}
          aria-label={liked ? `Remove ${saree.name} from wishlist` : `Add ${saree.name} to wishlist`}
          title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <span className={styles.heartIcon} aria-hidden="true">
            {liked ? '♥' : '♡'}
          </span>
        </button>
      </div>

      {/* Card Details */}
      <div className={styles.details}>
        {/* Saree Name */}
        <h3 className={styles.name}>{saree.name}</h3>

        {/* Fabric / Category */}
        <p className={styles.meta}>
          {saree.fabric} • {saree.category}
        </p>

        {/* Price */}
        <div className={styles.priceRow}>
          <span className={styles.price}>{saree.price}</span>
          <span className={styles.colorLabel}>{saree.color}</span>
        </div>

        {/* Add to Cart */}
        <button
          type="button"
          className={`${styles.addBtn} ${added ? styles.addBtnAdded : ''}`}
          onClick={handleAddToCart}
          aria-label={`Add ${saree.name} to cart`}
        >
          {added ? 'Added to Cart ✓' : 'Add to Cart'}
        </button>
      </div>
    </article>
  )
}

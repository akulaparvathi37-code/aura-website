import { useState } from 'react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import styles from './LehengaCard.module.css'

export default function LehengaCard({ lehenga, onSelect }) {
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()
  const { isLiked, toggleWishlist } = useWishlist()
  const liked = isLiked(lehenga.id)

  const handleAddToCart = (e) => {
    e.stopPropagation()
    addToCart(lehenga, 1, 'Full Bridal Ensemble')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  const handleToggleLike = (e) => {
    e.stopPropagation()
    toggleWishlist(lehenga.id)
  }

  return (
    <article
      className={styles.card}
      onClick={() => onSelect(lehenga)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(lehenga)
        }
      }}
      aria-label={`View details for ${lehenga.name}`}
    >
      {/* Front View Image */}
      <div className={styles.imageWrap}>
        <img
          src={(lehenga.images && lehenga.images.front) || lehenga.image || '/images/six-moods/lehengas.jpg'}
          alt={`${lehenga.name} - Front View`}
          className={styles.image}
          loading="lazy"
          draggable={false}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = '/images/six-moods/lehengas.jpg'
          }}
        />

        {/* Wishlist Heart Icon Button */}
        <button
          type="button"
          className={`${styles.likeBtn} ${liked ? styles.liked : ''}`}
          onClick={handleToggleLike}
          aria-label={liked ? `Remove ${lehenga.name} from wishlist` : `Add ${lehenga.name} to wishlist`}
          aria-pressed={liked}
          title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg
            className={styles.likeIcon}
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill={liked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <span className={styles.badge}>3 Views</span>
      </div>

      {/* Card Details */}
      <div className={styles.details}>
        <h3 className={styles.name}>{lehenga.name}</h3>

        <p className={styles.meta}>
          {lehenga.fabric} • {lehenga.category}
        </p>

        <div className={styles.priceRow}>
          <span className={styles.price}>{lehenga.price}</span>
          <span className={styles.colorLabel}>{lehenga.color}</span>
        </div>

        <div className={styles.actionRow}>
          <button
            type="button"
            className={`${styles.addBtn} ${added ? styles.addBtnAdded : ''}`}
            onClick={handleAddToCart}
            aria-label={`Add ${lehenga.name} to cart`}
          >
            {added ? 'Added ✓' : 'Add to Bag'}
          </button>

          <button
            type="button"
            className={styles.viewBtn}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(lehenga)
            }}
            aria-label={`Open 3-angle detail view for ${lehenga.name}`}
          >
            3 Angles
          </button>
        </div>
      </div>
    </article>
  )
}

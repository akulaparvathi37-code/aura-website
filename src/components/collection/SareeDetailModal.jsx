import { useState, useEffect } from 'react'
import { useWishlist } from '../../context/WishlistContext'
import { useCart } from '../../context/CartContext'
import styles from './SareeDetailModal.module.css'

export default function SareeDetailModal({ saree, onClose }) {
  const [added, setAdded] = useState(false)
  const { isLiked, toggleWishlist } = useWishlist()
  const { addToCart } = useCart()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!saree) return null

  const liked = isLiked(saree.id)

  const handleAddToCart = () => {
    addToCart(saree, 1, 'Pure Silk with Blouse')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={saree.name}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close product details"
        >
          ✕
        </button>

        <div className={styles.grid}>
          {/* Left Side: Large Masterpiece Image */}
          <div className={styles.imageColumn}>
            <div className={styles.imageWrap}>
              <img
                src={saree.image || '/images/products/royal-maroon.jpg'}
                alt={saree.name}
                className={styles.image}
                draggable={false}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = '/images/products/royal-maroon.jpg'
                }}
              />
              <button
                type="button"
                className={`${styles.imageLikeBtn} ${liked ? styles.imageLiked : ''}`}
                onClick={() => toggleWishlist(saree.id)}
                aria-label={liked ? `Remove ${saree.name} from wishlist` : `Add ${saree.name} to wishlist`}
                title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <span className={styles.heartIcon} aria-hidden="true">
                  {liked ? '♥' : '♡'}
                </span>
              </button>
            </div>
          </div>

          {/* Right Side: Product Details */}
          <div className={styles.infoColumn}>
            <div className={styles.categoryBadge}>{saree.category}</div>
            <h2 className={styles.title}>{saree.name}</h2>
            <div className={styles.priceRow}>
              <span className={styles.price}>{saree.price}</span>
              <span className={styles.inclusiveText}>(Inclusive of all luxury taxes)</span>
            </div>

            <div className={styles.divider} />

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fabric &amp; Weave:</span>
              <span className={styles.detailValue}>{saree.fabric}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Color Palette:</span>
              <span className={styles.detailValue}>{saree.color}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Craftsmanship:</span>
              <span className={styles.detailValue}>Handcrafted pure silk with authentic antique gold zari weave</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ensemble:</span>
              <span className={styles.detailValue}>Unstitched matching blouse piece included (0.8m)</span>
            </div>

            <div className={styles.divider} />

            {/* Editorial Image Prompt / Description */}
            {(saree.imagePrompt || saree.description) && (
              <div className={styles.promptBox}>
                <div className={styles.promptHeading}>Curatorial Weave Notes</div>
                <p className={styles.promptText}>&ldquo;{saree.imagePrompt || saree.description}&rdquo;</p>
              </div>
            )}

            {/* Actions */}
            <div className={styles.actionRow}>
              <button
                type="button"
                className={`${styles.cartBtn} ${added ? styles.cartBtnAdded : ''}`}
                onClick={handleAddToCart}
              >
                {added ? 'Added to Bag ✓' : 'Add to Shopping Bag'}
              </button>

              <button
                type="button"
                className={`${styles.wishlistActionBtn} ${liked ? styles.wishlistActionLiked : ''}`}
                onClick={() => toggleWishlist(saree.id)}
              >
                <span className={styles.actionHeart}>{liked ? '♥' : '♡'}</span>
                <span>{liked ? 'Saved to Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

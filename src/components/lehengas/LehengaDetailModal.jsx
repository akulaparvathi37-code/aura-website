import { useState, useEffect } from 'react'
import { useCart } from '../../context/CartContext'
import { useWishlist } from '../../context/WishlistContext'
import styles from './LehengaDetailModal.module.css'

const VIEWS = [
  { key: 'front', label: 'Front View', badge: 'Angle 1' },
  { key: 'rightAngle', label: 'Right Angle View', badge: 'Angle 2' },
  { key: 'leftAngle', label: 'Left Angle View', badge: 'Angle 3' },
]

export default function LehengaDetailModal({ lehenga, onClose }) {
  const [activeView, setActiveView] = useState('front')
  const [added, setAdded] = useState(false)
  const { addToCart } = useCart()
  const { isLiked, toggleWishlist } = useWishlist()
  const liked = isLiked(lehenga?.id)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!lehenga) return null

  const handleAddToCart = () => {
    addToCart(lehenga, 1, 'Full Bridal Ensemble')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  const currentImageSrc =
    (lehenga.images && (lehenga.images[activeView] || lehenga.images.front)) ||
    lehenga.image ||
    '/images/six-moods/lehengas.jpg'
  const currentPrompt =
    (lehenga.imagePrompts && (lehenga.imagePrompts[activeView] || lehenga.imagePrompts.front)) ||
    lehenga.description ||
    ''

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label={lehenga.name}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close product detail"
        >
          ✕
        </button>

        <div className={styles.grid}>
          {/* Left Column: Main Active Angle Display + 3 View Thumbnails */}
          <div className={styles.visualColumn}>
            {/* Main Angle View */}
            <div className={styles.mainImageWrap}>
              <img
                src={currentImageSrc || '/images/six-moods/lehengas.jpg'}
                alt={`${lehenga.name} - ${VIEWS.find((v) => v.key === activeView)?.label}`}
                className={styles.mainImage}
                draggable={false}
                onError={(e) => {
                  e.currentTarget.onerror = null
                  e.currentTarget.src = '/images/six-moods/lehengas.jpg'
                }}
              />
              <button
                type="button"
                className={`${styles.imageLikeBtn} ${liked ? styles.imageLiked : ''}`}
                onClick={() => toggleWishlist(lehenga.id)}
                aria-label={liked ? `Remove ${lehenga.name} from wishlist` : `Add ${lehenga.name} to wishlist`}
                title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <span className={styles.heartIcon} aria-hidden="true">
                  {liked ? '♥' : '♡'}
                </span>
              </button>
              <div className={styles.currentAngleTag}>
                {VIEWS.find((v) => v.key === activeView)?.label}
              </div>
            </div>

            {/* 3 Product Views Strip */}
            <div className={styles.viewsSection}>
              <div className={styles.viewsHeader}>
                <span className={styles.viewsTitle}>Select Camera View:</span>
                <span className={styles.viewsCount}>3 Angles Available</span>
              </div>

              <div className={styles.viewsGrid} role="tablist" aria-label="Product camera angles">
                {VIEWS.map((view) => {
                  const isSelected = activeView === view.key
                  const imgSrc =
                    (lehenga.images && (lehenga.images[view.key] || lehenga.images.front)) ||
                    lehenga.image ||
                    '/images/six-moods/lehengas.jpg'

                  return (
                    <button
                      key={view.key}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className={`${styles.viewCard} ${isSelected ? styles.viewCardActive : ''}`}
                      onClick={() => setActiveView(view.key)}
                    >
                      <div className={styles.thumbWrap}>
                        <img
                          src={imgSrc || '/images/six-moods/lehengas.jpg'}
                          alt={`${lehenga.name} ${view.label}`}
                          className={styles.thumbImg}
                          draggable={false}
                          onError={(e) => {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = '/images/six-moods/lehengas.jpg'
                          }}
                        />
                      </div>
                      <div className={styles.thumbMeta}>
                        <span className={styles.thumbBadge}>{view.badge}</span>
                        <span className={styles.thumbLabel}>{view.label}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Product Information & Controls */}
          <div className={styles.infoColumn}>
            <div className={styles.categoryBadge}>{lehenga.category}</div>
            <h2 className={styles.title}>{lehenga.name}</h2>
            <div className={styles.price}>{lehenga.price}</div>

            <div className={styles.divider} />

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Fabric:</span>
              <span className={styles.detailValue}>{lehenga.fabric}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Color:</span>
              <span className={styles.detailValue}>{lehenga.color}</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Craftsmanship:</span>
              <span className={styles.detailValue}>Handcrafted Antique Gold Zari Weaving</span>
            </div>

            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Ensemble Includes:</span>
              <span className={styles.detailValue}>Flared Lehenga, Embroidered Blouse, Finished Dupatta</span>
            </div>

            <div className={styles.divider} />

            {/* Prompt Transparency Box */}
            <div className={styles.promptBox}>
              <div className={styles.promptHeading}>
                <span>Prompt for Current Angle ({VIEWS.find((v) => v.key === activeView)?.label})</span>
              </div>
              <p className={styles.promptText}>&ldquo;{currentPrompt}&rdquo;</p>
            </div>

            {/* Add to Cart & Wishlist */}
            <div className={styles.actionRow}>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  className={`${styles.cartBtn} ${added ? styles.cartBtnAdded : ''}`}
                  onClick={handleAddToCart}
                >
                  {added ? 'Added to Bag ✓' : 'Add to Shopping Bag'}
                </button>
                <button
                  type="button"
                  className={`${styles.wishlistModalBtn} ${liked ? styles.wishlistModalLiked : ''}`}
                  onClick={() => toggleWishlist(lehenga.id)}
                  aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
                  title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill={liked ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                </button>
              </div>
              <button
                type="button"
                className={styles.backBtn}
                onClick={onClose}
              >
                Back to Collection
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

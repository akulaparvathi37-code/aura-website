import { useWishlist } from '../../context/WishlistContext'
import styles from './MoodCard.module.css'

export default function MoodCard({ mood, isSelected, onSelect }) {
  const { isLiked, toggleWishlist } = useWishlist()
  const liked = isLiked(mood.id)

  const handleToggleLike = (e) => {
    e.stopPropagation()
    toggleWishlist(mood.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(mood)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onSelect?.(mood)
        }
      }}
      aria-label={`Select mood: ${mood.title}`}
      aria-pressed={isSelected}
    >
      {/* Arch Outline Frame */}
      <div className={styles.archFrame}>
        <img
          src={mood.image}
          alt={mood.title}
          className={styles.image}
          loading="lazy"
          draggable={false}
        />
        <div className={styles.gradientOverlay} />

        {/* Wishlist Heart Icon Button */}
        <button
          type="button"
          className={`${styles.wishlistBtn} ${liked ? styles.wishlistActive : ''}`}
          onClick={handleToggleLike}
          aria-label={liked ? `Remove ${mood.title} from wishlist` : `Add ${mood.title} to wishlist`}
          aria-pressed={liked}
          title={liked ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg
            className={styles.wishlistIcon}
            width="15"
            height="15"
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
        
        {/* Active Pill Badge */}
        {isSelected && (
          <div className={styles.activeBadge} aria-hidden="true">
            <span className={styles.activeDot} />
            Selected
          </div>
        )}

        {/* Title Label */}
        <div className={styles.labelWrap}>
          <h3 className={styles.title}>{mood.title}</h3>
        </div>
      </div>
    </div>
  )
}

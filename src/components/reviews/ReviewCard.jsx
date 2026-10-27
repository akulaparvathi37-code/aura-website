import styles from './ReviewCard.module.css'

export default function ReviewCard({ review, isSelected, onSelect }) {
  const {
    customer_name = 'AURA Patron',
    avatar_url,
    rating = 5,
    comment = '',
    product_name = 'AURA Couture Ensemble',
    is_verified_purchase = true,
    created_at,
  } = review

  // Formatted date string
  const formattedDate = created_at
    ? new Date(created_at).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent'

  // Monogram initials for fallback avatar
  const initials = customer_name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A'

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(review)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopPropagation()
          onSelect?.(review)
        }
      }}
      aria-label={`Review by ${customer_name}: ${rating} stars`}
    >
      <div className={styles.archFrame}>
        {/* Subtle decorative gold arch aura */}
        <div className={styles.archGlow} />

        {/* Card Header: Avatar & Patron Details */}
        <div className={styles.cardHeader}>
          <div className={styles.avatarWrap}>
            {avatar_url ? (
              <img
                src={avatar_url}
                alt={customer_name}
                className={styles.avatarImg}
                loading="lazy"
              />
            ) : (
              <div className={styles.avatarInitials}>{initials}</div>
            )}
            {is_verified_purchase && (
              <span className={styles.verifiedBadge} title="Verified Patron">
                ✓
              </span>
            )}
          </div>

          <div className={styles.patronMeta}>
            <h4 className={styles.patronName}>{customer_name}</h4>
            <div className={styles.patronSub}>
              {is_verified_purchase && (
                <span className={styles.verifiedText}>Verified Patron</span>
              )}
              <span className={styles.reviewDate}>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* 5-Star Rating */}
        <div className={styles.starRow} aria-label={`${rating} out of 5 stars`}>
          {[1, 2, 3, 4, 5].map((star) => (
            <span
              key={star}
              className={`${styles.star} ${star <= rating ? styles.starActive : ''}`}
            >
              ★
            </span>
          ))}
        </div>

        {/* Review Comment Quote */}
        <div className={styles.quoteBody}>
          <span className={styles.quoteMark} aria-hidden="true">
            “
          </span>
          <p className={styles.commentText}>{comment}</p>
        </div>

        {/* Product / Drape Attribution */}
        <div className={styles.cardFooter}>
          <div className={styles.productTag}>
            <span className={styles.sparkleIcon}>✦</span>
            <span className={styles.productName}>{product_name}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

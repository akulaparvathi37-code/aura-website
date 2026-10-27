import styles from './OccasionCard.module.css'

export default function OccasionCard({ occasion, onSelect, className = '' }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${className}`}
      onClick={() => onSelect(occasion)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(occasion)
        }
      }}
      aria-label={`Explore ${occasion.title} edit`}
    >
      {/* Background Image */}
      <div className={styles.imageWrap}>
        <img
          src={occasion.image}
          alt={occasion.title}
          className={styles.image}
          loading="lazy"
          draggable={false}
        />
        <div className={styles.overlay} aria-hidden="true" />
      </div>

      {/* Content */}
      <div className={styles.content}>
        <span className={styles.tag}>{occasion.tag}</span>
        <h3 className={styles.title}>{occasion.title}</h3>
        <span className={styles.exploreLink}>
          <span>Explore</span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </span>
      </div>
    </div>
  )
}

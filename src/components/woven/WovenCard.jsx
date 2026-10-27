import styles from './WovenCard.module.css'

export default function WovenCard({ collection, isSelected, onSelect }) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${isSelected ? styles.cardSelected : ''}`}
      onClick={() => onSelect(collection)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(collection)
        }
      }}
      aria-label={`Explore ${collection.title} collection`}
      aria-pressed={isSelected}
    >
      {/* Content on the left */}
      <div className={styles.content}>
        <h4 className={styles.title}>{collection.title}</h4>
        <span className={styles.exploreLink}>
          <span>Explore</span>
          <span className={styles.arrow} aria-hidden="true">→</span>
        </span>
      </div>

      {/* High-res Swatch Image on the right */}
      <div className={styles.swatchWrap}>
        <img
          src={collection.image}
          alt={collection.title}
          className={styles.swatchImg}
          loading="lazy"
          draggable={false}
        />
        <div className={styles.swatchFade} aria-hidden="true" />
      </div>
    </div>
  )
}

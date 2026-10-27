import { useEffect } from 'react'
import styles from './OccasionModal.module.css'

export default function OccasionModal({ occasion, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!occasion) return null

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

        {/* Left Image Side */}
        <div className={styles.imageSide}>
          <img
            src={occasion.image}
            alt={occasion.title}
            className={styles.occasionImg}
          />
        </div>

        {/* Right Content Side */}
        <div className={styles.contentSide}>
          <span className={styles.tag}>{occasion.tag}</span>
          <h3 className={styles.title}>{occasion.title}</h3>
          <span className={styles.countBadge}>{occasion.count}</span>

          <p className={styles.description}>{occasion.description}</p>

          <div className={styles.sectionBlock}>
            <div className={styles.sectionLabel}>Popular For</div>
            <div className={styles.pillList}>
              {occasion.popularFor.map((moment) => (
                <span key={moment} className={styles.pill}>{moment}</span>
              ))}
            </div>
          </div>

          <div className={styles.sectionBlock}>
            <div className={styles.sectionLabel}>Signature Fabrics</div>
            <div className={styles.pillList}>
              {occasion.fabrics.map((fabric) => (
                <span key={fabric} className={styles.pill}>{fabric}</span>
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={onClose}
            >
              Explore {occasion.title}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

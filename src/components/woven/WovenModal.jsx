import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import styles from './WovenModal.module.css'

export default function WovenModal({ collection, onClose }) {
  const overlayRef = useRef(null)
  const dialogRef  = useRef(null)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    // GSAP entrance
    const ctx = gsap.context(() => {
      gsap.fromTo(overlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.35 })
      gsap.fromTo(
        dialogRef.current,
        { opacity: 0, scale: 0.94, y: 20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.45, ease: 'power3.out' }
      )
    })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      ctx.revert()
    }
  }, [onClose])

  if (!collection) return null

  const { details } = collection

  return (
    <div
      ref={overlayRef}
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="woven-modal-title"
    >
      <div ref={dialogRef} className={styles.modalCard}>
        {/* Close button */}
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Close modal"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className={styles.layout}>
          {/* Visual Showcase */}
          <div className={styles.visualSide}>
            <img
              src={collection.image}
              alt={collection.title}
              className={styles.modalImg}
            />
            <div className={styles.imgTag}>{collection.tagline}</div>
          </div>

          {/* Details & Story */}
          <div className={styles.infoSide}>
            <p className={styles.eyebrow}>AURA SIGNATURE ARCHIVE</p>
            <h3 id="woven-modal-title" className={styles.title}>
              {collection.title}
            </h3>
            <p className={styles.subtitle}>{collection.subtitle}</p>

            <div className={styles.specBox}>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Artisanal Origin:</span>
                <span className={styles.specValue}>{details.origin}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Crafting Duration:</span>
                <span className={styles.specValue}>{details.craftTime}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Purity Standard:</span>
                <span className={styles.specValue}>{details.purity}</span>
              </div>
              <div className={styles.specRow}>
                <span className={styles.specLabel}>Curated Pricing:</span>
                <span className={styles.specValueGold}>{details.priceRange}</span>
              </div>
            </div>

            <p className={styles.description}>{details.description}</p>

            <div className={styles.highlightPills}>
              {details.highlights.map((h) => (
                <span key={h} className={styles.pill}>{h}</span>
              ))}
            </div>

            <div className={styles.actions}>
              <button type="button" className={`btn-pill ${styles.actionPrimary}`}>
                <span>View Full Collection</span>
                <span>→</span>
              </button>
              <button type="button" className={styles.actionSecondary}>
                Book Atelier Appointment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

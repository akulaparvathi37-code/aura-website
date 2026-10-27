import { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { OCCASIONS } from '../../data/occasions'
import OccasionCard from '../occasions/OccasionCard'
import OccasionModal from '../occasions/OccasionModal'
import styles from './OccasionsSection.module.css'

export default function OccasionsSection({ onNavigate }) {
  const [selectedOccasion, setSelectedOccasion] = useState(null)

  const sectionRef   = useRef(null)
  const textBlockRef = useRef(null)
  const gridRef      = useRef(null)

  const weddingBridal        = OCCASIONS.find((o) => o.id === 'wedding-bridal')
  const festiveCelebrations  = OCCASIONS.find((o) => o.id === 'festive-celebrations')
  const partyNights          = OCCASIONS.find((o) => o.id === 'party-nights')
  const everydayElegance     = OCCASIONS.find((o) => o.id === 'everyday-elegance')

  /* Viewport Entrance Reveal */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

            // Text block reveal
            if (textBlockRef.current) {
              tl.fromTo(
                textBlockRef.current.children,
                { opacity: 0, y: 28 },
                { opacity: 1, y: 0, duration: 0.75, stagger: 0.12 },
                0
              )
            }

            // Cards stagger reveal
            const cards = gridRef.current ? gridRef.current.querySelectorAll(`.${styles.tallCardWrap}, .${styles.subRow} > div, .${styles.wideCardWrap}`) : []
            if (cards.length > 0) {
              tl.fromTo(
                cards,
                { opacity: 0, y: 35, scale: 0.97 },
                { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.12 },
                0.2
              )
            }
          }, sectionRef)

          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="occasions"
      aria-label="Edits for Every Occasion — AURA Curated Collections"
    >
      <div className={styles.container}>
        <div ref={gridRef} className={styles.grid}>
          {/* Column 1: Editorial Text Block */}
          <div ref={textBlockRef} className={styles.textBlock}>
            <h2 className={styles.heading}>
              <span className={styles.headingUpper}>EDITS FOR</span>
              <span className={styles.headingItalic}>every occasion</span>
            </h2>
            <p className={styles.subtext}>
              From intimate celebrations to grand occasions, find the perfect look for your special moments.
            </p>
            <button
              type="button"
              className={styles.ctaBtn}
              onClick={() => {
                if (onNavigate) {
                  onNavigate('sarees')
                } else {
                  window.location.hash = '#sarees'
                }
              }}
              aria-label="Explore all occasion edits in sarees collection"
            >
              <span>EXPLORE ALL OCCASIONS</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </button>
          </div>

          {/* Column 2: Large / Tall Wedding & Bridal Card */}
          <div className={styles.tallCardWrap}>
            <OccasionCard
              occasion={weddingBridal}
              onSelect={setSelectedOccasion}
            />
          </div>

          {/* Column 3: Asymmetric Subgrid */}
          <div className={styles.subgrid}>
            {/* Top Row: 2 Compact Cards */}
            <div className={styles.subRow}>
              <OccasionCard
                occasion={festiveCelebrations}
                onSelect={setSelectedOccasion}
              />
              <OccasionCard
                occasion={partyNights}
                onSelect={setSelectedOccasion}
              />
            </div>

            {/* Bottom Row: 1 Wide Landscape Card */}
            <div className={styles.wideCardWrap}>
              <OccasionCard
                occasion={everydayElegance}
                onSelect={setSelectedOccasion}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Selected Occasion Spotlight Modal */}
      {selectedOccasion && (
        <OccasionModal
          occasion={selectedOccasion}
          onClose={() => setSelectedOccasion(null)}
        />
      )}
    </section>
  )
}

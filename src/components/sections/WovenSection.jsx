import { useState, useRef, useEffect } from 'react'
import { gsap } from 'gsap'
import { WOVEN_COLLECTIONS } from '../../data/woven'
import WovenCard from '../woven/WovenCard'
import WovenModal from '../woven/WovenModal'
import styles from './WovenSection.module.css'

export default function WovenSection({ onNavigate }) {
  const [selectedCollection, setSelectedCollection] = useState(null)

  const sectionRef   = useRef(null)
  const textWrapRef  = useRef(null)
  const cardsWrapRef = useRef(null)

  /* ---------- Viewport Entrance Animations ---------- */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const ctx = gsap.context(() => {
            const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

            // Text elements reveal
            if (textWrapRef.current) {
              tl.fromTo(
                textWrapRef.current.children,
                { opacity: 0, y: 24 },
                { opacity: 1, y: 0, duration: 0.7, stagger: 0.12 },
                0
              )
            }

            // Right stacked cards stagger
            if (cardsWrapRef.current) {
              tl.fromTo(
                cardsWrapRef.current.children,
                { opacity: 0, x: 28 },
                { opacity: 1, x: 0, duration: 0.65, stagger: 0.14 },
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
      id="woven"
      aria-label="Woven to Be Remembered — AURA Signature Craftsmanship"
    >
      <div className={styles.container}>
        <div className={styles.contentGrid}>
          {/* Left Column: Editorial Text Block */}
          <div ref={textWrapRef} className={styles.textWrap}>
            <p className={styles.eyebrow}>OUR SIGNATURE</p>
            <h2 className={styles.heading}>
              <span className={styles.headingLine}>Woven to Be</span>
              <span className={styles.headingLine}>Remembered</span>
            </h2>
            <p className={styles.subtext}>
              Each weave carries a story of silk, heritage, and timeless Indian elegance.
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
              aria-label="Explore AURA Signature Sarees Collection"
            >
              <span>EXPLORE THE SIGNATURES</span>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </button>
          </div>

          {/* Right Column: 3 Stacked Luxury Category Cards */}
          <div ref={cardsWrapRef} className={styles.cardsWrap}>
            {WOVEN_COLLECTIONS.map((collection) => (
              <WovenCard
                key={collection.id}
                collection={collection}
                isSelected={selectedCollection?.id === collection.id}
                onSelect={(col) => setSelectedCollection(col)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Collection Spotlight Modal */}
      {selectedCollection && (
        <WovenModal
          collection={selectedCollection}
          onClose={() => setSelectedCollection(null)}
        />
      )}
    </section>
  )
}

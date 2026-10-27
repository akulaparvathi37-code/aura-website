import { useState, useEffect } from 'react'
import { LEHENGAS_COLLECTION } from '../data/lehengasCollection'
import { getStorefrontLehengas, subscribeToStorefrontProducts } from '../lib/products/productService'
import LehengaCard from '../components/lehengas/LehengaCard'
import LehengaDetailModal from '../components/lehengas/LehengaDetailModal'
import styles from './LehengasCollectionPage.module.css'

export default function LehengasCollectionPage({ onBack }) {
  const [lehengas, setLehengas] = useState(LEHENGAS_COLLECTION)
  const [selectedLehenga, setSelectedLehenga] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadLehengas = async () => {
      try {
        const liveLehengas = await getStorefrontLehengas()
        if (isMounted && liveLehengas && liveLehengas.length > 0) {
          setLehengas(liveLehengas)
        }
      } catch (err) {
        console.warn('Error loading live lehengas from Supabase:', err)
      }
    }

    loadLehengas()

    const unsubscribe = subscribeToStorefrontProducts(() => {
      loadLehengas()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  return (
    <div className={styles.page} id="lehengas-collection-page">
      <div className={styles.container}>
        {/* Header Block */}
        <div className={styles.headerBlock}>
          <button
            type="button"
            className={styles.breadcrumb}
            onClick={onBack}
            aria-label="Return to AURA Home"
          >
            ← Back to Home
          </button>

          <span className={styles.eyebrow}>— EXCLUSIVE BRIDAL &amp; COUTURE EDIT</span>
          <h1 className={styles.heading}>LEHENGAS COLLECTION</h1>
          <p className={styles.subtext}>
            Five bespoke bridal and couture ensembles handcrafted with heritage zari embroidery, luxurious drapes, and complete multi-angle views.
          </p>
          <span className={styles.countInfo}>
            Showing {lehengas.length} {lehengas.length === 5 ? 'of 5 ' : ''}Masterpiece Lehengas • Click Any Ensemble to View All 3 Angles
          </span>
        </div>

        {/* Masterpiece Lehengas Grid */}
        <section className={styles.grid} aria-label="AURA Lehengas Collection">
          {lehengas.map((lehenga) => (
            <LehengaCard
              key={lehenga.id}
              lehenga={lehenga}
              onSelect={(item) => setSelectedLehenga(item)}
            />
          ))}
        </section>
      </div>

      {/* 3-Angle Detail View Modal */}
      {selectedLehenga && (
        <LehengaDetailModal
          lehenga={selectedLehenga}
          onClose={() => setSelectedLehenga(null)}
        />
      )}
    </div>
  )
}

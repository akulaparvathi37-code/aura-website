import { useState, useEffect } from 'react'
import { SAREES_COLLECTION } from '../data/sareesCollection'
import { getStorefrontSarees, subscribeToStorefrontProducts } from '../lib/products/productService'
import SareeCard from '../components/collection/SareeCard'
import SareeDetailModal from '../components/collection/SareeDetailModal'
import styles from './SareesCollectionPage.module.css'

export default function SareesCollectionPage({ onBack, onSelectSaree }) {
  const [sarees, setSarees] = useState(SAREES_COLLECTION)
  const [activeSaree, setActiveSaree] = useState(null)

  useEffect(() => {
    let isMounted = true

    const loadSarees = async () => {
      try {
        const liveSarees = await getStorefrontSarees()
        if (isMounted && liveSarees && liveSarees.length > 0) {
          setSarees(liveSarees)
        }
      } catch (err) {
        console.warn('Error loading live sarees from Supabase:', err)
      }
    }

    loadSarees()

    const unsubscribe = subscribeToStorefrontProducts(() => {
      loadSarees()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const handleSelect = (saree) => {
    if (onSelectSaree) {
      onSelectSaree(saree)
    } else {
      setActiveSaree(saree)
    }
  }

  return (
    <div className={styles.page} id="sarees-collection-page">
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

          <span className={styles.eyebrow}>— EXCLUSIVE EDIT</span>
          <h1 className={styles.heading}>SAREES COLLECTION</h1>
          <p className={styles.subtext}>
            Ten bespoke handcrafted weaves celebrating timeless Indian silk heritage, from royal Kanchipurams to celestial Banarasis.
          </p>
          <span className={styles.countInfo}>
            Showing {sarees.length} {sarees.length === 10 ? 'of 10 ' : ''}Masterpiece Sarees
          </span>
        </div>

        {/* Masterpiece Sarees Grid */}
        <section className={styles.grid} aria-label="AURA Sarees Collection">
          {sarees.map((saree) => (
            <SareeCard
              key={saree.id}
              saree={saree}
              onSelect={handleSelect}
            />
          ))}
        </section>
      </div>

      {/* Saree Detail Experience */}
      {!onSelectSaree && activeSaree && (
        <SareeDetailModal
          saree={activeSaree}
          onClose={() => setActiveSaree(null)}
        />
      )}
    </div>
  )
}

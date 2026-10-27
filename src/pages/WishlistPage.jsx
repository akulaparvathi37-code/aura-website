import { useState, useMemo } from 'react'
import { SAREES_COLLECTION } from '../data/sareesCollection'
import { PRODUCTS } from '../data/products'
import { LEHENGAS_COLLECTION } from '../data/lehengasCollection'
import { MOODS } from '../data/moods'
import { useWishlist } from '../context/WishlistContext'
import SareeCard from '../components/collection/SareeCard'
import LehengaDetailModal from '../components/lehengas/LehengaDetailModal'
import styles from './WishlistPage.module.css'

// Unified catalog list across all collections
const ALL_CATALOG_ITEMS = [
  ...SAREES_COLLECTION.map((item) => ({ ...item, type: 'saree' })),
  ...PRODUCTS.map((p) => ({
    ...p,
    color: p.color || p.fabric?.split(' ')[0] || 'Artisanal',
    type: 'bestseller',
  })),
  ...LEHENGAS_COLLECTION.map((l) => ({
    ...l,
    image: l.images.front,
    type: 'lehenga',
  })),
  ...MOODS.map((m) => (m.product ? { ...m.product, type: 'mood' } : null)).filter(Boolean),
]

export default function WishlistPage({ onBack, onNavigate, onSelectSaree }) {
  const { wishlist } = useWishlist()
  const [selectedLehenga, setSelectedLehenga] = useState(null)

  const likedItems = useMemo(() => {
    const seen = new Set()
    const items = []

    for (const id of wishlist) {
      const strId = String(id)
      if (seen.has(strId)) continue
      const found = ALL_CATALOG_ITEMS.find((item) => String(item.id) === strId)
      if (found) {
        seen.add(strId)
        items.push(found)
      }
    }
    return items
  }, [wishlist])

  const handleSelectItem = (item) => {
    if (item.type === 'lehenga' || item.images?.front) {
      const fullLehenga = LEHENGAS_COLLECTION.find((l) => String(l.id) === String(item.id))
      setSelectedLehenga(fullLehenga || item)
    } else {
      onSelectSaree?.(item)
    }
  }

  return (
    <div className={styles.page} id="wishlist-page">
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

          <span className={styles.eyebrow}>— YOUR BESPOKE CURATION</span>
          <h1 className={styles.heading}>YOUR WISHLIST</h1>
          <p className={styles.subtext}>
            Handcrafted pieces saved from Six Moods, Best Sellers, and Lehengas. Review your favorites, explore multi-angle details, or add them directly to your shopping bag.
          </p>
          <span className={styles.countInfo}>
            {likedItems.length === 1
              ? 'Showing 1 Saved Piece'
              : `Showing ${likedItems.length} Saved Pieces`}
          </span>
        </div>

        {/* Content Area */}
        {likedItems.length === 0 ? (
          <div className={styles.emptyContainer}>
            <span className={styles.emptyHeart}>♡</span>
            <h2 className={styles.emptyTitle}>No liked items yet.</h2>
            <p className={styles.emptySubtext}>
              Click the heart icon on any piece across Six Moods, Best Sellers, or Lehengas to save your favorites here.
            </p>
            <button
              type="button"
              className={styles.exploreBtn}
              onClick={() => onNavigate?.('sarees')}
            >
              Explore Collections →
            </button>
          </div>
        ) : (
          <section className={styles.grid} aria-label="Curated Wishlist Collection">
            {likedItems.map((item) => (
              <SareeCard
                key={item.id}
                saree={item}
                onSelect={handleSelectItem}
              />
            ))}
          </section>
        )}
      </div>

      {/* Lehenga Multi-Angle Detail Modal */}
      {selectedLehenga && (
        <LehengaDetailModal
          lehenga={selectedLehenga}
          onClose={() => setSelectedLehenga(null)}
        />
      )}
    </div>
  )
}

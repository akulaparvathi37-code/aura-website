import { useState, useEffect, useRef } from 'react'
import { SAREES_COLLECTION } from '../../data/sareesCollection'
import SareeCard from '../collection/SareeCard'
import styles from './SareeSearchModal.module.css'

const SUGGESTIONS = ['Banarasi', 'Kanchipuram', 'Silk', 'Red', 'Blue', 'Organza', 'Gold']

export default function SareeSearchModal({ isOpen, onClose, onSelectSaree }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
      setQuery('')
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const trimmedQuery = query.trim().toLowerCase()

  const filteredSarees = trimmedQuery
    ? SAREES_COLLECTION.filter((saree) => {
        const nameMatch = saree.name.toLowerCase().includes(trimmedQuery)
        const catMatch = saree.category.toLowerCase().includes(trimmedQuery)
        const fabricMatch = saree.fabric.toLowerCase().includes(trimmedQuery)
        const colorMatch = saree.color.toLowerCase().includes(trimmedQuery)
        const promptMatch = saree.imagePrompt?.toLowerCase().includes(trimmedQuery)
        return nameMatch || catMatch || fabricMatch || colorMatch || promptMatch
      })
    : SAREES_COLLECTION

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Search Sarees">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header / Search Bar */}
        <div className={styles.searchHeader}>
          <div className={styles.inputWrap}>
            <SearchIcon className={styles.searchIcon} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Sarees by name, category, fabric, or color (e.g. Banarasi, Silk, Red)..."
              className={styles.input}
              aria-label="Search Sarees"
            />
            {query && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => setQuery('')}
                aria-label="Clear search query"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close search"
          >
            ✕
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className={styles.chipsRow}>
          <span className={styles.chipsLabel}>Suggestions:</span>
          {SUGGESTIONS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`${styles.chip} ${trimmedQuery === tag.toLowerCase() ? styles.chipActive : ''}`}
              onClick={() => setQuery(tag)}
            >
              {tag}
            </button>
          ))}
          {query && (
            <button
              type="button"
              className={styles.chipReset}
              onClick={() => setQuery('')}
            >
              Show All (10)
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className={styles.resultsArea}>
          <div className={styles.resultsHeader}>
            <span className={styles.resultsMeta}>
              {trimmedQuery
                ? `Search results for "${query}" (${filteredSarees.length} found)`
                : `All Masterpiece Sarees (${filteredSarees.length})`}
            </span>
          </div>

          {filteredSarees.length === 0 ? (
            <div className={styles.noResults}>
              <div className={styles.noResultsIcon}>🔍</div>
              <h3 className={styles.noResultsTitle}>No Sarees found</h3>
              <p className={styles.noResultsSubtitle}>
                No matching handcrafted sarees found for &ldquo;{query}&rdquo;. Try searching by fabric, color, or style such as &ldquo;Banarasi&rdquo;, &ldquo;Silk&rdquo;, &ldquo;Red&rdquo;, or &ldquo;Gold&rdquo;.
              </p>
              <button
                type="button"
                className={styles.resetBtn}
                onClick={() => setQuery('')}
              >
                View All Sarees
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {filteredSarees.map((saree) => (
                <SareeCard
                  key={saree.id}
                  saree={saree}
                  onSelect={(item) => {
                    onClose()
                    onSelectSaree?.(item)
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SearchIcon({ className }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7.5" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}

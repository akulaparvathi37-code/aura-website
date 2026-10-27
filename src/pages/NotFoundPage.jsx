import styles from './NotFoundPage.module.css'

export default function NotFoundPage({ onNavigate, onBack }) {
  const handleHome = () => {
    if (onBack) {
      onBack()
    } else if (onNavigate) {
      onNavigate('home')
    } else {
      window.location.href = '/'
    }
  }

  const handleNavigate = (page) => {
    if (onNavigate) {
      onNavigate(page)
    } else {
      window.location.hash = page === 'home' ? '' : page
    }
  }

  return (
    <div className={styles.page} id="aura-not-found-page" role="main" aria-labelledby="not-found-heading">
      <div className={styles.ambientGlow} aria-hidden="true" />

      <div className={styles.container}>
        {/* Breadcrumb / Top Return */}
        <div className={styles.navBar}>
          <button
            type="button"
            className={styles.backButton}
            onClick={handleHome}
            aria-label="Return to AURA Home"
          >
            <span className={styles.arrow} aria-hidden="true">←</span>
            <span>Return to Atelier</span>
          </button>
        </div>

        {/* Central 404 Stage */}
        <div className={styles.stage}>
          {/* Ornamental Motif */}
          <div className={styles.crestWrap} aria-hidden="true">
            <svg
              className={styles.crestSvg}
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="32" cy="32" r="30" stroke="url(#goldGrad)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <polygon points="32,8 56,32 32,56 8,32" stroke="url(#goldGrad)" strokeWidth="1.2" />
              <polygon points="32,16 48,32 32,48 16,32" stroke="url(#goldGrad)" strokeWidth="0.8" opacity="0.7" />
              <circle cx="32" cy="32" r="4" fill="url(#goldGrad)" />
              <defs>
                <linearGradient id="goldGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E2C26E" />
                  <stop offset="0.5" stopColor="#C9A84C" />
                  <stop offset="1" stopColor="#9A7A2E" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className={styles.eyebrow}>
            <span className={styles.line} aria-hidden="true" />
            <span>ERROR 404 · WEAVE NOT FOUND</span>
            <span className={styles.line} aria-hidden="true" />
          </div>

          <h1 className={styles.code}>404</h1>

          <h2 id="not-found-heading" className={styles.heading}>
            Page Not Found
          </h2>

          <p className={styles.description}>
            The page you are looking for does not exist, has been archived, or may have been moved to another gallery.
          </p>

          {/* Primary Action Buttons */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={handleHome}
              aria-label="Back to Home"
            >
              <span>Back to Home</span>
              <span className={styles.ctaArrow} aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleNavigate('sarees')}
              aria-label="Explore Sarees Collection"
            >
              <span>Explore Sarees</span>
            </button>

            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={() => handleNavigate('lehengas')}
              aria-label="Explore Lehengas Couture"
            >
              <span>Explore Lehengas</span>
            </button>
          </div>

          {/* Curated Quick Access Directory */}
          <div className={styles.directoryBlock}>
            <span className={styles.directoryTitle}>RECOMMENDED GALLERIES</span>
            <div className={styles.directoryLinks}>
              <button
                type="button"
                className={styles.dirLink}
                onClick={() => handleNavigate('sarees')}
              >
                Handloom Silk Sarees
              </button>
              <span className={styles.dirDivider} aria-hidden="true">·</span>
              <button
                type="button"
                className={styles.dirLink}
                onClick={() => handleNavigate('lehengas')}
              >
                Royal Bridal Lehengas
              </button>
              <span className={styles.dirDivider} aria-hidden="true">·</span>
              <button
                type="button"
                className={styles.dirLink}
                onClick={() => handleNavigate('wishlist')}
              >
                Curated Wishlist
              </button>
              <span className={styles.dirDivider} aria-hidden="true">·</span>
              <button
                type="button"
                className={styles.dirLink}
                onClick={() => handleNavigate('orders')}
              >
                Patron Orders
              </button>
            </div>
          </div>
        </div>

        {/* Brand signature */}
        <div className={styles.signature} aria-hidden="true">
          <span>AURA ATELIER</span>
          <span className={styles.sigDivider}>·</span>
          <span>HAUTE TRADITION & HERITAGE WEAVES</span>
        </div>
      </div>
    </div>
  )
}

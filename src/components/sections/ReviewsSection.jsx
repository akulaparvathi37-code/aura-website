import { useState, useRef, useEffect, useCallback } from 'react'
import { fetchFeaturedReviews, subscribeToReviews } from '../../lib/reviews/reviewService'
import ReviewCard from '../reviews/ReviewCard'
import styles from './ReviewsSection.module.css'

const TOTAL_DISPLAY_SLOTS = 24 // Smooth circular wrapping buffer

function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

function getShortestDistance(slotIndex, currentPosition, total) {
  const currentCycle = ((currentPosition % total) + total) % total
  let diff = slotIndex - currentCycle
  if (diff > total / 2) diff -= total
  if (diff < -total / 2) diff += total
  return diff
}

export default function ReviewsSection({ onOpenReview }) {
  const [reviews, setReviews] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState(null)
  const [isHovered, setIsHovered] = useState(false)

  // Carousel physics & animation refs
  const viewportRef = useRef(null)
  const cardRefs = useRef([])
  const positionRef = useRef(0)
  const targetPositionRef = useRef(0)
  const velocityRef = useRef(0)
  const autoSpeedRef = useRef(0.14) // Gentle ambient drift
  const isPointerDownRef = useRef(false)
  const isDraggingRef = useRef(false)
  const isHoveredRef = useRef(false)
  const isWheelingRef = useRef(false)
  const wheelTimerRef = useRef(null)
  const selectedReviewRef = useRef(null)
  const startXRef = useRef(0)
  const startPosRef = useRef(0)
  const lastXRef = useRef(0)
  const lastTimeRef = useRef(0)
  const dragDistRef = useRef(0)
  const capturedRef = useRef(false)
  const cardSpacingRef = useRef(290)

  // Keep refs synchronized
  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  useEffect(() => {
    selectedReviewRef.current = selectedReview
  }, [selectedReview])

  // Load reviews and subscribe to realtime updates
  useEffect(() => {
    let isMounted = true

    const loadReviews = async () => {
      try {
        const data = await fetchFeaturedReviews()
        if (isMounted) {
          setReviews(data || [])
          setIsLoading(false)
        }
      } catch (err) {
        console.warn('Reviews load error:', err)
        if (isMounted) {
          setReviews([])
          setIsLoading(false)
        }
      }
    }

    loadReviews()

    const unsubscribe = subscribeToReviews(() => {
      loadReviews()
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  // Responsive card spacing calculation
  useEffect(() => {
    const updateSpacing = () => {
      const w = window.innerWidth
      if (w < 640) {
        cardSpacingRef.current = 245
      } else if (w < 1024) {
        cardSpacingRef.current = 285
      } else {
        cardSpacingRef.current = 315
      }
    }

    updateSpacing()
    window.addEventListener('resize', updateSpacing)
    return () => window.removeEventListener('resize', updateSpacing)
  }, [])

  // Prepare display items (repeat reviews to fill carousel slots for seamless infinite rotation)
  const displayItems =
    reviews.length > 0
      ? Array.from({ length: TOTAL_DISPLAY_SLOTS }, (_, index) => ({
          ...reviews[index % reviews.length],
          slotKey: `review-slot-${index}`,
          originalIndex: index % reviews.length,
        }))
      : []

  /* ---------- CompleteShelf RAF Motion Engine ---------- */
  useEffect(() => {
    if (displayItems.length === 0) return

    let lastTime = performance.now()
    const startTime = performance.now()
    let animationFrameId

    const updateFrame = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.08)
      lastTime = time
      const elapsed = (time - startTime) / 1000

      // Auto-scroll drift slows when interacting
      const isInteracting =
        isDraggingRef.current ||
        isHoveredRef.current ||
        isWheelingRef.current ||
        Boolean(selectedReviewRef.current)

      autoSpeedRef.current = damp(autoSpeedRef.current, isInteracting ? 0 : 0.14, 2.5, dt)

      if (autoSpeedRef.current > 0.0001) {
        targetPositionRef.current += autoSpeedRef.current * dt
      }

      // Velocity inertia
      if (Math.abs(velocityRef.current) > 0.001) {
        targetPositionRef.current += velocityRef.current * dt
        velocityRef.current *= Math.pow(0.92, dt * 60)
      } else {
        velocityRef.current = 0
      }

      // Position damping
      positionRef.current = isDraggingRef.current
        ? targetPositionRef.current
        : damp(positionRef.current, targetPositionRef.current, 9.5, dt)

      const currentPos = positionRef.current
      const spacing = cardSpacingRef.current
      const total = TOTAL_DISPLAY_SLOTS

      // Update 3D perspective transforms
      for (let i = 0; i < total; i++) {
        const el = cardRefs.current[i]
        if (!el) continue

        let offset = i - currentPos
        offset -= Math.round(offset / total) * total
        const distance = Math.abs(offset)
        const focus = Math.max(0, 1 - Math.min(distance, 1))

        // Cull distant cards
        if (distance > 4.5) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }

        const targetX = offset * spacing
        const idle = Math.sin(elapsed * 0.7 + (i % 5) * 0.9) * 2.5 * focus
        const targetY = -focus * 8 + idle
        const targetZ = focus * 35 - Math.min(distance, 3.5) * 22
        const rotY = -Math.max(-18, Math.min(18, offset * 6.5))
        const rotZ = -Math.max(-2, Math.min(2, offset * 0.5))
        const scale = 0.94 + focus * 0.08
        const opacity = distance > 3.6 ? Math.max(0, 1 - (distance - 3.6) / 0.9) : 1

        el.style.transform = `translate3d(${targetX}px, ${targetY}px, ${targetZ}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`
        el.style.opacity = `${opacity}`
        el.style.zIndex = `${Math.round(100 - distance * 10)}`
        el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none'
      }

      animationFrameId = requestAnimationFrame(updateFrame)
    }

    animationFrameId = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(animationFrameId)
  }, [displayItems.length])

  /* ---------- Pointer Drag & Touch Handlers ---------- */
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return
    isPointerDownRef.current = true
    isDraggingRef.current = false
    startXRef.current = e.clientX
    startPosRef.current = targetPositionRef.current
    lastXRef.current = e.clientX
    lastTimeRef.current = performance.now()
    dragDistRef.current = 0
    velocityRef.current = 0
    capturedRef.current = false
  }

  const handlePointerMove = (e) => {
    if (!isPointerDownRef.current) return
    const deltaX = e.clientX - startXRef.current
    dragDistRef.current = Math.abs(deltaX)

    if (!isDraggingRef.current && dragDistRef.current > 12) {
      isDraggingRef.current = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
        capturedRef.current = true
      } catch (_) {}
    }

    if (isDraggingRef.current) {
      targetPositionRef.current = startPosRef.current - deltaX / cardSpacingRef.current

      const now = performance.now()
      const dt = Math.max((now - lastTimeRef.current) / 1000, 0.016)
      const dx = (lastXRef.current - e.clientX) / cardSpacingRef.current
      velocityRef.current = velocityRef.current * 0.4 + (dx / dt) * 0.6
      lastXRef.current = e.clientX
      lastTimeRef.current = now
    }
  }

  const handlePointerUp = (e) => {
    if (!isPointerDownRef.current) return
    isPointerDownRef.current = false

    if (capturedRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch (_) {}
      capturedRef.current = false
    }

    if (isDraggingRef.current) {
      setTimeout(() => {
        isDraggingRef.current = false
      }, 50)
    }
  }

  // Smooth step controls
  const handleStep = useCallback((direction) => {
    velocityRef.current = 0
    const currentRound = Math.round(targetPositionRef.current)
    targetPositionRef.current = currentRound + direction
  }, [])

  const handleCardClick = (slotIndex, item) => {
    if (dragDistRef.current > 12) return // Was a drag, do not trigger click

    if (selectedReview?.id === item.id) {
      setSelectedReview(null)
    } else {
      setSelectedReview(item)
      // Smoothly center the clicked card
      const diff = getShortestDistance(slotIndex, positionRef.current, TOTAL_DISPLAY_SLOTS)
      targetPositionRef.current = positionRef.current + diff
    }
  }

  return (
    <section
      id="reviews"
      className={styles.reviewsSection}
      aria-label="Section 6: Customer Reviews"
    >
      {/* Dark Ambient Layer over Peacock Background */}
      <div className={styles.bgOverlay} />

      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.header}>
          <div className={styles.headerText}>
            <span className={styles.kicker}>PATRON EXPERIENCES</span>
            <h2 className={styles.heading}>Loved by Every Silhouette</h2>
            <p className={styles.description}>
              Real experiences from the AURA community.
            </p>
          </div>

          {/* Action Row: CTA + Controls */}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={styles.ctaButton}
              onClick={onOpenReview}
              aria-label="Give your review"
            >
              <span>Share Your Experience</span>
              <span className={styles.ctaSparkle} aria-hidden="true">✦</span>
            </button>

            {reviews.length > 0 && (
              <div className={styles.navControls}>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => handleStep(-1)}
                  aria-label="Previous review"
                >
                  ←
                </button>
                <button
                  type="button"
                  className={styles.navBtn}
                  onClick={() => handleStep(1)}
                  aria-label="Next review"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content Body */}
        {isLoading ? (
          <div className={styles.loadingWrap}>
            <div className={styles.spinner} />
            <span className={styles.loadingText}>Gathering patron reflections...</span>
          </div>
        ) : reviews.length === 0 ? (
          /* Empty State: exactly as required */
          <div className={styles.emptyContainer}>
            <div className={styles.emptyIcon}>✦</div>
            <h3 className={styles.emptyHeading}>
              Be the first to share your AURA experience.
            </h3>
            <p className={styles.emptyDesc}>
              Every drape tells a story of grace and grandeur. Share how your AURA ensemble
              illuminated your special celebration.
            </p>
            <button
              type="button"
              className={styles.emptyCtaBtn}
              onClick={onOpenReview}
            >
              Write the First Review ✦
            </button>
          </div>
        ) : (
          /* 3D CompleteShelf Carousel */
          <div
            ref={viewportRef}
            className={styles.viewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className={styles.stage}>
              {displayItems.map((item, index) => {
                const isSelected = selectedReview?.id === item.id
                return (
                  <div
                    key={item.slotKey}
                    ref={(el) => (cardRefs.current[index] = el)}
                    className={styles.cardSlot}
                  >
                    <ReviewCard
                      review={item}
                      isSelected={isSelected}
                      onSelect={() => handleCardClick(index, item)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

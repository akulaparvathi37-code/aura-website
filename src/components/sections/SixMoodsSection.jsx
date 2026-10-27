import { useState, useRef, useEffect, useCallback } from 'react'
import { MOODS } from '../../data/moods'
import MoodCard from '../moods/MoodCard'
import MoodProductPreview from '../moods/MoodProductPreview'
import styles from './SixMoodsSection.module.css'

const TOTAL_SLOTS = 24 // 4 complete cycles of 6 moods for infinite seamless wrapping

/**
 * CompleteShelf spring damping utility:
 * Exponential smoothing independent of frame rate.
 */
function damp(current, target, lambda, dt) {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

/**
 * Modular shortest distance formula around a circular sequence.
 * Guarantees shortest path without unnecessary full rotations.
 */
function getShortestDistance(slotIndex, currentPosition, total) {
  const currentCycle = ((currentPosition % total) + total) % total
  let diff = slotIndex - currentCycle
  if (diff > total / 2) diff -= total
  if (diff < -total / 2) diff += total
  return diff
}

export default function SixMoodsSection({ onNavigate }) {
  const [selectedMood, setSelectedMood] = useState(null)
  const [isHovered, setIsHovered] = useState(false)

  // Carousel physics & animation refs
  const viewportRef        = useRef(null)
  const cardRefs           = useRef([])
  const positionRef        = useRef(0)
  const targetPositionRef  = useRef(0)
  const velocityRef        = useRef(0)
  const autoSpeedRef       = useRef(0.18) // smooth initial drift
  const isPointerDownRef   = useRef(false)
  const isDraggingRef      = useRef(false)
  const isHoveredRef       = useRef(false)
  const selectedMoodRef    = useRef(null)
  const isWheelingRef      = useRef(false)
  const wheelTimerRef      = useRef(null)
  const didJustDragRef     = useRef(false)
  const lastClickTimeRef   = useRef(0)
  const capturedRef        = useRef(false)
  const startXRef          = useRef(0)
  const startPosRef        = useRef(0)
  const lastXRef           = useRef(0)
  const lastTimeRef        = useRef(0)
  const dragDistRef        = useRef(0)
  const cardSpacingRef     = useRef(220)

  // Keep refs synchronized with state for RAF loop
  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  useEffect(() => {
    selectedMoodRef.current = selectedMood
  }, [selectedMood])

  // Responsive card spacing calculation
  useEffect(() => {
    const updateSpacing = () => {
      const w = window.innerWidth
      if (w < 768) {
        cardSpacingRef.current = 175
      } else if (w < 1024) {
        cardSpacingRef.current = 200
      } else {
        cardSpacingRef.current = 222
      }
    }

    updateSpacing()
    window.addEventListener('resize', updateSpacing)
    return () => window.removeEventListener('resize', updateSpacing)
  }, [])

  /* ---------- CompleteShelf RAF Motion Engine ---------- */
  useEffect(() => {
    let lastTime = performance.now()
    const startTime = performance.now()
    let animationFrameId

    const updateFrame = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.08) // clamp dt to prevent jumps on tab unfocus
      lastTime = time
      const elapsed = (time - startTime) / 1000

      // 1. Organic auto-scroll speed adjustment:
      // When user is interacting (hovering, dragging, wheeling, or mood selected), auto-scroll smoothly pauses to 0.
      // When interaction ends and no mood is selected, auto-scroll smoothly accelerates back to 0.18 slots/sec.
      const isInteracting = isDraggingRef.current || isHoveredRef.current || isWheelingRef.current || Boolean(selectedMoodRef.current)
      autoSpeedRef.current = damp(autoSpeedRef.current, isInteracting ? 0 : 0.18, 2.6, dt)

      if (autoSpeedRef.current > 0.0001) {
        targetPositionRef.current += autoSpeedRef.current * dt
      }

      // 2. Momentum velocity damping (CompleteShelf exponential inertia)
      if (Math.abs(velocityRef.current) > 0.001) {
        targetPositionRef.current += velocityRef.current * dt
        velocityRef.current *= Math.pow(0.93, dt * 60)
      } else {
        velocityRef.current = 0
      }

      // 3. CompleteShelf position damping
      positionRef.current = isDraggingRef.current
        ? targetPositionRef.current
        : damp(positionRef.current, targetPositionRef.current, 9.5, dt)

      const currentPos = positionRef.current
      const spacing = cardSpacingRef.current
      const total = TOTAL_SLOTS

      // 4. Update each card's 3D perspective transform
      for (let i = 0; i < total; i++) {
        const el = cardRefs.current[i]
        if (!el) continue

        let offset = i - currentPos
        // CompleteShelf circular wrapping modulo:
        offset -= Math.round(offset / total) * total
        const distance = Math.abs(offset)
        const focus = Math.max(0, 1 - Math.min(distance, 1))

        // Cull items outside visibility range
        if (distance > 5.5) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }

        const targetX = offset * spacing
        // Subtle organic breathing float on center cards
        const idle = Math.sin(elapsed * 0.72 + (i % 6) * 0.85) * 2.5 * focus
        // Center card lifts subtly:
        const targetY = -focus * 8 + idle
        // CompleteShelf parabolic 3D depth curvature:
        const targetZ = focus * 35 - Math.min(distance, 3.8) * 20
        // Inward perspective yaw rotation:
        const rotY = -Math.max(-20, Math.min(20, offset * 7.5))
        // Subtle roll tilt:
        const rotZ = -Math.max(-2.5, Math.min(2.5, offset * 0.6))
        // Dynamic scale tapering from center:
        const scale = 0.94 + focus * 0.08
        // Opacity fade only on the far edge outside the screen:
        const opacity = distance > 4.2 ? Math.max(0, 1 - (distance - 4.2) / 1.0) : 1

        el.style.transform = `translate3d(${targetX}px, ${targetY}px, ${targetZ}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`
        el.style.opacity = `${opacity}`
        el.style.zIndex = `${Math.round(100 - distance * 10)}`
        el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none'
      }

      animationFrameId = requestAnimationFrame(updateFrame)
    }

    animationFrameId = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(animationFrameId)
  }, [])

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

    // Only initiate drag after intentional movement threshold (> 14px)
    if (!isDraggingRef.current && dragDistRef.current > 14) {
      isDraggingRef.current = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
        capturedRef.current = true
      } catch (_) {}
    }

    if (isDraggingRef.current) {
      // Translate pointer drag into slot coordinates
      targetPositionRef.current = startPosRef.current - deltaX / cardSpacingRef.current

      // Calculate instantaneous velocity for inertia
      const now = performance.now()
      const dt = Math.max(10, now - lastTimeRef.current) / 1000
      const vx = -(e.clientX - lastXRef.current) / cardSpacingRef.current / dt
      velocityRef.current = velocityRef.current * 0.6 + vx * 0.4
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
      // Clamp release velocity to prevent excessive spinning
      velocityRef.current = Math.max(-5, Math.min(5, velocityRef.current))

      // Set flag to prevent click event right after a drag
      didJustDragRef.current = true
      setTimeout(() => {
        didJustDragRef.current = false
        isDraggingRef.current = false
        dragDistRef.current = 0
      }, 100)
    } else {
      isDraggingRef.current = false
      dragDistRef.current = 0
    }
  }

  /* ---------- Non-Interfering Horizontal Wheel Listener (Zero Vertical Scroll Hijacking) ---------- */
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const handleWheel = (e) => {
      // Normal vertical mouse wheel or trackpad scroll MUST scroll the page natively!
      // Return immediately if there is any vertical scroll component.
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) || Math.abs(e.deltaX) < 4) {
        return
      }

      // Only handle intentional horizontal gestures (e.g. trackpad 2-finger horizontal swipe)
      isWheelingRef.current = true
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = setTimeout(() => {
        isWheelingRef.current = false
      }, 300)

      const impulse = Math.max(-0.4, Math.min(0.4, e.deltaX * 0.0014))
      targetPositionRef.current += impulse
      velocityRef.current = impulse * 3
    }

    el.addEventListener('wheel', handleWheel, { passive: true })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current)
    }
  }, [])

  /* ---------- Slot Click Handler & Selection ---------- */
  const handleCardClick = useCallback((slotIndex, mood) => {
    // If the user was dragging, ignore
    if (didJustDragRef.current || isDraggingRef.current || dragDistRef.current > 12) {
      return
    }

    // Debounce to prevent duplicate triggers
    const now = performance.now()
    if (now - lastClickTimeRef.current < 200) {
      return
    }
    lastClickTimeRef.current = now

    // Smoothly align the clicked card to center
    const diff = getShortestDistance(slotIndex, targetPositionRef.current, TOTAL_SLOTS)
    targetPositionRef.current += diff
    velocityRef.current = 0

    // Set selected/active mood (or toggle if clicking already active)
    setSelectedMood((prev) => (prev?.id === mood.id ? null : mood))
  }, [])

  // Create virtual array of 24 slots mapping to the 6 moods
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, idx) => ({
    slotIndex: idx,
    mood: MOODS[idx % MOODS.length]
  }))

  return (
    <section className={styles.section} id="six-moods" aria-label="Six Moods — Explore Our World">
      <div className={styles.container}>
        {/* Section Header */}
        <div className={styles.headerRow}>
          <div className={styles.titleWrap}>
            <p className={styles.eyebrow}>
              <span className={styles.dash} aria-hidden="true">—</span> EXPLORE OUR WORLD
            </p>
            <h2 className={styles.heading}>SIX MOODS</h2>
            <p className={styles.subtext}>Different occasions, one elegance.</p>
          </div>

          <a
            href="#lehengas"
            className={styles.viewAllLink}
            onClick={(e) => {
              e.preventDefault()
              if (onNavigate) {
                onNavigate('lehengas')
              } else {
                window.location.hash = '#lehengas'
              }
            }}
          >
            <span>View All Categories</span>
            <span className={styles.arrow} aria-hidden="true">→</span>
          </a>
        </div>

        {/* CompleteShelf 3D Carousel Viewport */}
        <div
          ref={viewportRef}
          className={styles.shelfViewport}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* 3D Shelf Stage */}
          <div className={styles.shelfStage}>
            {slots.map(({ slotIndex, mood }) => (
              <div
                key={`slot-${slotIndex}`}
                ref={(el) => { cardRefs.current[slotIndex] = el }}
                className={styles.cardSlot}
              >
                <MoodCard
                  mood={mood}
                  isSelected={selectedMood?.id === mood.id}
                  onSelect={() => handleCardClick(slotIndex, mood)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Selected Mood Lookbook / Product Preview */}
        {selectedMood && (
          <MoodProductPreview
            mood={selectedMood}
            onClose={() => setSelectedMood(null)}
          />
        )}
      </div>
    </section>
  )
}

import { useState, useRef, useEffect, useCallback } from 'react'
import ProductCard from './ProductCard'
import styles from './ProductShelfRow.module.css'

const TOTAL_SLOTS = 24

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

export default function ProductShelfRow({
  direction = 'right',
  products = [],
  wishlist,
  isLiked,
  activeProductId,
  onSelectProduct,
  onToggleWishlist,
  onAddToCart,
  onProductClick,
  initialOffset = 0,
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [activeSlotIndex, setActiveSlotIndex] = useState(null)
  const activeProductRef = useRef(activeProductId)

  const viewportRef       = useRef(null)
  const cardRefs          = useRef([])
  const positionRef       = useRef(initialOffset)
  const targetPositionRef = useRef(initialOffset)
  const velocityRef       = useRef(0)
  const autoSpeedRef      = useRef(0.18)
  const isPointerDownRef  = useRef(false)
  const isDraggingRef     = useRef(false)
  const isHoveredRef      = useRef(false)
  const isWheelingRef     = useRef(false)
  const wheelTimerRef     = useRef(null)
  const didJustDragRef    = useRef(false)
  const lastClickTimeRef  = useRef(0)
  const capturedRef       = useRef(false)
  const startXRef         = useRef(0)
  const startPosRef       = useRef(initialOffset)
  const lastXRef          = useRef(0)
  const lastTimeRef       = useRef(0)
  const dragDistRef       = useRef(0)
  const cardSpacingRef    = useRef(265)

  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  useEffect(() => {
    activeProductRef.current = activeProductId
  }, [activeProductId])

  useEffect(() => {
    const updateSpacing = () => {
      const w = window.innerWidth
      if (w < 768) {
        cardSpacingRef.current = 215
      } else if (w < 1024) {
        cardSpacingRef.current = 240
      } else {
        cardSpacingRef.current = 265
      }
    }
    updateSpacing()
    window.addEventListener('resize', updateSpacing)
    return () => window.removeEventListener('resize', updateSpacing)
  }, [])

  /* CompleteShelf RAF Motion Loop */
  useEffect(() => {
    let lastTime = performance.now()
    const startTime = performance.now()
    let animationFrameId

    const updateFrame = (time) => {
      const dt = Math.min((time - lastTime) / 1000, 0.08)
      lastTime = time
      const elapsed = (time - startTime) / 1000

      // Auto-scroll speed damping (smooth pause on hover/drag/wheel/active-product)
      const isInteracting = isDraggingRef.current || isHoveredRef.current || isWheelingRef.current || Boolean(activeProductRef.current)
      autoSpeedRef.current = damp(autoSpeedRef.current, isInteracting ? 0 : 0.18, 2.6, dt)

      if (autoSpeedRef.current > 0.0001) {
        // ROW 1: right (decrease target position)
        // ROW 2: left (increase target position)
        if (direction === 'right') {
          targetPositionRef.current -= autoSpeedRef.current * dt
        } else {
          targetPositionRef.current += autoSpeedRef.current * dt
        }
      }

      // Momentum inertia damping
      if (Math.abs(velocityRef.current) > 0.001) {
        targetPositionRef.current += velocityRef.current * dt
        velocityRef.current *= Math.pow(0.93, dt * 60)
      } else {
        velocityRef.current = 0
      }

      // Position damping
      positionRef.current = isDraggingRef.current
        ? targetPositionRef.current
        : damp(positionRef.current, targetPositionRef.current, 9.5, dt)

      const currentPos = positionRef.current
      const spacing = cardSpacingRef.current
      const total = TOTAL_SLOTS

      // Update 3D perspective transforms
      for (let i = 0; i < total; i++) {
        const el = cardRefs.current[i]
        if (!el) continue

        let offset = i - currentPos
        offset -= Math.round(offset / total) * total
        const distance = Math.abs(offset)
        const focus = Math.max(0, 1 - Math.min(distance, 1))

        if (distance > 5.5) {
          el.style.opacity = '0'
          el.style.pointerEvents = 'none'
          continue
        }

        const targetX = offset * spacing
        const idle = Math.sin(elapsed * 0.72 + (i % 6) * 0.85) * 2.2 * focus
        const targetY = -focus * 6 + idle
        const targetZ = focus * 32 - Math.min(distance, 3.8) * 18
        const rotY = -Math.max(-18, Math.min(18, offset * 6.5))
        const rotZ = -Math.max(-2, Math.min(2, offset * 0.5))
        const scale = 0.94 + focus * 0.08
        const opacity = distance > 4.4 ? Math.max(0, 1 - (distance - 4.4) / 1.0) : 1

        el.style.transform = `translate3d(${targetX}px, ${targetY}px, ${targetZ}px) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`
        el.style.opacity = `${opacity}`
        el.style.zIndex = `${Math.round(100 - distance * 10)}`
        el.style.pointerEvents = opacity > 0.3 ? 'auto' : 'none'
      }

      animationFrameId = requestAnimationFrame(updateFrame)
    }

    animationFrameId = requestAnimationFrame(updateFrame)
    return () => cancelAnimationFrame(animationFrameId)
  }, [direction])

  /* Pointer Drag Handlers */
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

    if (!isDraggingRef.current && dragDistRef.current > 14) {
      isDraggingRef.current = true
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
        capturedRef.current = true
      } catch (_) {}
    }

    if (isDraggingRef.current) {
      targetPositionRef.current = startPosRef.current - deltaX / cardSpacingRef.current

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
      velocityRef.current = Math.max(-5, Math.min(5, velocityRef.current))
      didJustDragRef.current = true
      setTimeout(() => {
        didJustDragRef.current = false
        isDraggingRef.current = false
        dragDistRef.current = 0
      }, 120)
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
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX) || Math.abs(e.deltaX) < 4) {
        return
      }

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

  /* Card Click Handler — Smoothly animate to center & activate */
  const handleCardClick = useCallback((slotIndex, product) => {
    if (didJustDragRef.current || isDraggingRef.current || dragDistRef.current > 12) return

    const now = performance.now()
    if (now - lastClickTimeRef.current < 200) return
    lastClickTimeRef.current = now

    // Smoothly align the clicked card to center
    const diff = getShortestDistance(slotIndex, targetPositionRef.current, TOTAL_SLOTS)
    targetPositionRef.current += diff
    velocityRef.current = 0

    setActiveSlotIndex(slotIndex)
    onSelectProduct?.(product)
  }, [onSelectProduct])

  const checkIsWishlisted = useCallback((productId) => {
    if (typeof isLiked === 'function') return isLiked(productId)
    if (wishlist?.has) return wishlist.has(productId)
    if (Array.isArray(wishlist)) return wishlist.includes(String(productId))
    return false
  }, [isLiked, wishlist])

  // Virtual slots array
  const slots = Array.from({ length: TOTAL_SLOTS }, (_, idx) => ({
    slotIndex: idx,
    product: products[idx % products.length],
  }))

  return (
    <div
      ref={viewportRef}
      className={styles.shelfViewport}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      aria-label={`Product showcase scrolling ${direction}`}
    >
      <div className={styles.shelfStage}>
        {slots.map(({ slotIndex, product }) => {
          const isCardActive = activeProductId
            ? product?.id === activeProductId
            : activeSlotIndex === slotIndex

          return (
            <div
              key={`slot-${slotIndex}`}
              ref={(el) => { cardRefs.current[slotIndex] = el }}
              className={styles.cardSlot}
            >
              <ProductCard
                product={product}
                isActive={isCardActive}
                isWishlisted={checkIsWishlisted(product?.id)}
                onToggleWishlist={onToggleWishlist}
                onAddToCart={onAddToCart}
                onSelect={() => {
                  handleCardClick(slotIndex, product)
                  if (isCardActive) {
                    onProductClick?.(product)
                  }
                }}
                onQuickView={() => {
                  handleCardClick(slotIndex, product)
                  onProductClick?.(product)
                }}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

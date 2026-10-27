import { useRef, useEffect, useState, useCallback } from 'react'
import { gsap } from 'gsap'
import HeroScene from '../hero/HeroScene'
import styles from './HeroSection.module.css'

const SLIDES = [
  {
    id: 1,
    target: 'sarees',
    label: 'TIMELESS TRADITION',
    headingLine1: 'SAREES FOR',
    headingLine2: 'every story',
    subtextLine1: 'Modern elegance, rooted in tradition.',
    subtextLine2: 'Discover handcrafted sarees for your',
    subtextLine3: 'most memorable moments.',
    cta: 'EXPLORE ALL',
    image: '/images/hero/hero-main.jpg',
    imageAlt: 'South Asian woman wearing a regal deep peacock-teal silk saree with antique gold zari detailing in a palace interior',
  },
  {
    id: 2,
    target: 'lehengas',
    label: 'ROYAL HERITAGE',
    headingLine1: 'LEHENGAS OF',
    headingLine2: 'pure grandeur',
    subtextLine1: 'Bespoke bridal weaves & couture craftsmanship.',
    subtextLine2: 'Embroidered in heirloom champagne gold',
    subtextLine3: 'for royal celebrations.',
    cta: 'EXPLORE ALL',
    image: '/images/hero/hero-lehenga.jpg',
    imageAlt: 'South Asian woman wearing a regal deep wine and maroon velvet lehenga with antique champagne gold zari embroidery in an opulent palace',
  },
]

export default function HeroSection({ onNavigate }) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const isInitialMount = useRef(true)

  // Mouse parallax refs — direct transform updates, zero React re-renders
  const mouseX = useRef(0)
  const mouseY = useRef(0)

  // Target DOM refs
  const sectionRef   = useRef(null)
  const labelRef     = useRef(null)
  const heading1Ref  = useRef(null)
  const heading2Ref  = useRef(null)
  const subtextRef   = useRef(null)
  const ctaRef       = useRef(null)
  const imageWrapRef = useRef(null)
  const overlayRef   = useRef(null)
  const controlsRef  = useRef(null)
  const indicatorRef = useRef(null)

  /* ---------- Initial Entrance Animation on Page Mount ---------- */
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

      // 1. Hero visual fade in & settle
      tl.fromTo(
        imageWrapRef.current,
        { opacity: 0, scale: 1.04 },
        { opacity: 1, scale: 1.02, duration: 1.3, ease: 'power2.out' },
        0
      )

      // 2. Subtle left gradient vignette reveal
      tl.fromTo(
        overlayRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 1.0 },
        0.2
      )

      // 3. Staggered text & CTA reveal
      tl.fromTo(labelRef.current,    { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.65 }, 0.45)
      tl.fromTo(heading1Ref.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7  }, 0.6)
      tl.fromTo(heading2Ref.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.7  }, 0.72)
      tl.fromTo(subtextRef.current,  { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.65 }, 0.88)
      tl.fromTo(ctaRef.current,      { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6  }, 1.02)

      // 4. Side chevrons & slide indicator
      tl.fromTo(controlsRef.current,  { opacity: 0 },         { opacity: 1, duration: 0.6  }, 1.15)
      tl.fromTo(indicatorRef.current, { opacity: 0, y: 10 },  { opacity: 1, y: 0, duration: 0.6 }, 1.2)
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  /* ---------- Animate new text IN whenever current slide updates ---------- */
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const textElements = [
      labelRef.current,
      heading1Ref.current,
      heading2Ref.current,
      subtextRef.current,
      ctaRef.current,
    ]

    gsap.fromTo(
      textElements,
      { opacity: 0, y: 16 },
      {
        opacity: 1,
        y: 0,
        duration: 0.5,
        stagger: 0.05,
        ease: 'power3.out',
        onComplete: () => setTransitioning(false),
      }
    )
  }, [current])

  /* ---------- Subtle Mouse Parallax (Desktop) ---------- */
  const handleMouseMove = useCallback((e) => {
    const { clientWidth: w, clientHeight: h } = e.currentTarget
    mouseX.current = (e.clientX / w - 0.5) * 2
    mouseY.current = (e.clientY / h - 0.5) * -2

    if (imageWrapRef.current) {
      imageWrapRef.current.style.transform =
        `scale(1.02) translate3d(${mouseX.current * -5}px, ${mouseY.current * -3}px, 0)`
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    mouseX.current = 0
    mouseY.current = 0
    if (imageWrapRef.current) {
      gsap.to(imageWrapRef.current, {
        scale: 1.02,
        x: 0,
        y: 0,
        duration: 0.9,
        ease: 'power2.out',
      })
    }
  }, [])

  /* ---------- Slide Navigation Transition ---------- */
  const goToSlide = useCallback((nextIdx) => {
    if (transitioning || nextIdx === current) return
    setTransitioning(true)

    const textElements = [
      labelRef.current,
      heading1Ref.current,
      heading2Ref.current,
      subtextRef.current,
      ctaRef.current,
    ]

    // Animate current text elements out smoothly, then update slide index
    gsap.to(textElements, {
      opacity: 0,
      y: -10,
      duration: 0.25,
      stagger: 0.03,
      ease: 'power2.in',
      onComplete: () => {
        setCurrent(nextIdx)
      },
    })
  }, [current, transitioning])

  /* ---------- Keyboard Arrow Navigation ---------- */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft') {
        goToSlide((current - 1 + SLIDES.length) % SLIDES.length)
      } else if (e.key === 'ArrowRight') {
        goToSlide((current + 1) % SLIDES.length)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [current, goToSlide])

  const slide = SLIDES[current]

  return (
    <section
      ref={sectionRef}
      className={styles.hero}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="AURA Hero — Sarees & Lehengas Collection"
      tabIndex={0}
    >
      {/* ---- Background visuals: Saree & Lehenga Campaign Images ---- */}
      <div ref={imageWrapRef} className={styles.imageWrap} aria-hidden="true">
        {SLIDES.map((s, idx) => (
          <img
            key={s.id}
            src={s.image}
            alt={s.imageAlt}
            className={`${styles.heroImg} ${idx === current ? styles.heroImgActive : styles.heroImgHidden}`}
            loading="eager"
            fetchPriority={idx === 0 ? 'high' : 'auto'}
          />
        ))}
      </div>

      {/* ---- Subtle left vignette overlay for text legibility ---- */}
      <div ref={overlayRef} className={styles.overlay} aria-hidden="true" />

      {/* ---- Subtle Three.js atmospheric gold dust ---- */}
      <HeroScene mouseX={mouseX} mouseY={mouseY} />

      {/* ---- Hero Editorial Text Panel (Left aligned, matching Image 2) ---- */}
      <div className={styles.content}>
        <p ref={labelRef} className={styles.label}>
          {slide.label}
        </p>

        <h1 className={styles.heading}>
          <span ref={heading1Ref} className={styles.headingLine1}>
            {slide.headingLine1}
          </span>
          <span ref={heading2Ref} className={styles.headingLine2}>
            {slide.headingLine2}
          </span>
        </h1>

        <div ref={subtextRef} className={styles.subtext}>
          <p>{slide.subtextLine1}</p>
          <p>{slide.subtextLine2}</p>
          <p>{slide.subtextLine3}</p>
        </div>

        <div className={styles.ctaWrap}>
          <button
            ref={ctaRef}
            type="button"
            className={styles.ctaBtn}
            onClick={() => {
              const target = slide.target || 'sarees'
              if (onNavigate) {
                onNavigate(target)
              } else {
                window.location.hash = `#${target}`
              }
            }}
            aria-label={`${slide.cta} - Discover AURA ${slide.target === 'lehengas' ? 'Lehengas' : 'Sarees'} collection`}
          >
            <span>{slide.cta}</span>
            <span className={styles.ctaArrow} aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* ---- Side Navigation Chevrons (Thin minimal lines matching Image 2) ---- */}
      <div ref={controlsRef} className={styles.controls}>
        <button
          type="button"
          className={`${styles.navChevron} ${styles.navChevronLeft}`}
          onClick={() => goToSlide((current - 1 + SLIDES.length) % SLIDES.length)}
          aria-label="Previous slide"
          disabled={transitioning}
        >
          <ChevronLeftIcon />
        </button>

        <button
          type="button"
          className={`${styles.navChevron} ${styles.navChevronRight}`}
          onClick={() => goToSlide((current + 1) % SLIDES.length)}
          aria-label="Next slide"
          disabled={transitioning}
        >
          <ChevronRightIcon />
        </button>
      </div>

      {/* ---- Slide Indicator & Progress Bar (Matching Image 2: 01 / 03 — • —) ---- */}
      <div
        ref={indicatorRef}
        className={styles.slideIndicator}
        aria-label={`Slide ${current + 1} of ${SLIDES.length}`}
      >
        <span className={styles.slideCounter}>
          {String(current + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </span>

        <div className={styles.progressBars} role="tablist" aria-label="Hero slide switcher">
          {SLIDES.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={idx === current}
              aria-label={`Slide ${idx + 1}`}
              className={`${styles.progressBarItem} ${idx === current ? styles.progressBarActive : ''}`}
              onClick={() => goToSlide(idx)}
            >
              <span className={styles.progressLine} />
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------- Thin minimal chevron icons (matching Image 2) ---------- */
function ChevronLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

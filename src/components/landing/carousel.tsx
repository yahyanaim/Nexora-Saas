"use client"

import useEmblaCarousel from "embla-carousel-react"
import { Children, useCallback, useEffect, useRef, useState } from "react"
import s from "./landing.module.css"

interface Props {
  children: React.ReactNode
  label: string
  /** Advance every n ms; 0 turns autoplay off */
  autoplay?: number
  /** Slide width class (from landing.module.css) */
  slideClass?: string
}

/**
 * Landing-page carousel: drag or swipe, square prev/next buttons, a slide
 * counter and a progress bar. Autoplay stops for good once someone uses it and
 * pauses on hover, focus, off screen and with reduced motion.
 */
export function Carousel({ children, label, autoplay = 0, slideClass }: Props) {
  const slides = Children.toArray(children)
  const [viewportRef, api] = useEmblaCarousel({ loop: true, align: "start", skipSnaps: false })
  const [index, setIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const paused = useRef(false)
  const stopped = useRef(false)

  const onSelect = useCallback(() => {
    if (!api) return
    setIndex(api.selectedScrollSnap())
  }, [api])

  useEffect(() => {
    if (!api) return
    const onPointer = () => {
      stopped.current = true
    }
    api.on("select", onSelect).on("reInit", onSelect).on("pointerDown", onPointer)
    return () => {
      api.off("select", onSelect).off("reInit", onSelect).off("pointerDown", onPointer)
    }
  }, [api, onSelect])

  useEffect(() => {
    if (!api || !autoplay) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const root = rootRef.current
    let inView = true
    const io = new IntersectionObserver(([e]) => {
      inView = !!e?.isIntersecting
    })
    if (root) io.observe(root)
    const id = window.setInterval(() => {
      if (!paused.current && !stopped.current && inView) api.scrollNext()
    }, autoplay)
    return () => {
      window.clearInterval(id)
      io.disconnect()
    }
  }, [api, autoplay])

  const go = (dir: -1 | 1) => {
    stopped.current = true
    if (dir < 0) api?.scrollPrev()
    else api?.scrollNext()
  }

  return (
    <div
      ref={rootRef}
      className={s.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
      onFocus={() => (paused.current = true)}
      onBlur={() => (paused.current = false)}
    >
      <div className={s.carouselViewport} ref={viewportRef}>
        <div className={s.carouselTrack}>
          {slides.map((child, i) => (
            <div
              key={i}
              className={`${s.carouselSlide} ${slideClass ?? ""}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}`}
            >
              {child}
            </div>
          ))}
        </div>
      </div>
      <div className={s.carouselBar}>
        <span className={s.carouselCount}>
          {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
        </span>
        <span className={s.carouselProgress} aria-hidden>
          <span style={{ transform: `scaleX(${slides.length > 1 ? (index + 1) / slides.length : 1})` }} />
        </span>
        <span className={s.carouselButtons}>
          <button type="button" className={s.carouselBtn} onClick={() => go(-1)} aria-label="Previous slide">
            ←
          </button>
          <button type="button" className={s.carouselBtn} onClick={() => go(1)} aria-label="Next slide">
            →
          </button>
        </span>
      </div>
    </div>
  )
}

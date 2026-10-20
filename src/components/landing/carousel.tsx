"use client"

import { Children, useEffect, useRef, useState } from "react"
import { fill, type LandingCopy } from "./copy"
import s from "./landing.module.css"

interface Props {
  children: React.ReactNode
  label: string
  /** Auto-scroll speed in pixels a second */
  speed?: number
  /** Slide width class (from landing.module.css) */
  slideClass?: string
  /** Button and slide names for assistive tech */
  words: LandingCopy["carousel"]
}

/**
 * Landing-page carousel that glides continuously. It eases to a stop on
 * hover or focus and when off screen; the arrows glide one slide; it can be
 * dragged or swiped with a little momentum. The slides are drawn twice so the
 * loop has no seam (the copy is hidden from assistive tech). With reduced
 * motion it stays still and the arrows still work.
 */
export function Carousel({ children, label, speed = 45, slideClass, words }: Props) {
  const slides = Children.toArray(children)
  const count = slides.length
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const [index, setIndex] = useState(0)
  const ctl = useRef({ x: 0, v: 0, nudge: 0, hold: false, inView: true, slideW: 0, drag: null as null | { x: number; t: number; vel: number } })

  useEffect(() => {
    const track = trackRef.current
    const viewport = viewportRef.current
    if (!track || !viewport) return
    const c = ctl.current
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let setW = 0
    const measure = () => {
      setW = track.scrollWidth / 2
      c.slideW = (track.firstElementChild as HTMLElement | null)?.getBoundingClientRect().width ?? 0
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(track)
    const io = new IntersectionObserver(([e]) => {
      c.inView = !!e?.isIntersecting
    })
    io.observe(viewport)

    let raf = 0
    let last = performance.now()
    let lastIndex = -1
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      if (!setW) return
      // ease the speed towards its target so starts and stops are soft
      const want = reduced || c.hold || c.drag || !c.inView ? 0 : speed
      c.v += (want - c.v) * Math.min(1, dt * 3)
      let dx = -c.v * dt
      if (c.nudge) {
        // glide the rest of a nudge (arrows, a flick) with an ease-out
        let step = reduced ? c.nudge : c.nudge * Math.min(1, dt * 6)
        if (Math.abs(c.nudge - step) < 0.5) step = c.nudge
        c.nudge -= step
        dx += step
      }
      c.x += dx
      while (c.x <= -setW) c.x += setW
      while (c.x > 0) c.x -= setW
      track.style.transform = `translate3d(${c.x.toFixed(2)}px,0,0)`
      const pos = -c.x
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0.02, pos / setW).toFixed(4)})`
      const i = c.slideW ? Math.round(pos / c.slideW) % count : 0
      if (i !== lastIndex) {
        lastIndex = i
        setIndex(i)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [count, speed])

  const glide = (dir: -1 | 1) => {
    // next (1) moves the content left by one slide
    ctl.current.nudge += -dir * (ctl.current.slideW || 300)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return
    ctl.current.drag = { x: e.clientX, t: performance.now(), vel: 0 }
    ctl.current.nudge = 0
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = ctl.current.drag
    if (!d) return
    const now = performance.now()
    const dx = e.clientX - d.x
    ctl.current.x += dx
    d.vel = dx / Math.max(1, now - d.t)
    d.x = e.clientX
    d.t = now
  }
  const onPointerUp = () => {
    const d = ctl.current.drag
    if (!d) return
    ctl.current.nudge = d.vel * 220 // px of glide after letting go
    ctl.current.drag = null
  }

  return (
    <div
      className={s.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => (ctl.current.hold = true)}
      onMouseLeave={() => (ctl.current.hold = false)}
      onFocus={() => (ctl.current.hold = true)}
      onBlur={() => (ctl.current.hold = false)}
    >
      <div
        className={s.carouselViewport}
        ref={viewportRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className={s.carouselTrack} ref={trackRef}>
          {[0, 1].map((copy) =>
            slides.map((child, i) => (
              <div
                key={`${copy}-${i}`}
                className={`${s.carouselSlide} ${slideClass ?? ""}`}
                role={copy ? undefined : "group"}
                aria-roledescription={copy ? undefined : "slide"}
                aria-label={copy ? undefined : fill(words.slide, { n: i + 1, count })}
                aria-hidden={copy ? true : undefined}
                inert={copy ? true : undefined}
              >
                {child}
              </div>
            )),
          )}
        </div>
      </div>
      <div className={s.carouselBar}>
        <span className={s.carouselCount}>
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <span className={s.carouselProgress} aria-hidden>
          <span ref={progressRef} />
        </span>
        <span className={s.carouselButtons}>
          <button type="button" className={s.carouselBtn} onClick={() => glide(-1)} aria-label={words.previous}>
            ←
          </button>
          <button type="button" className={s.carouselBtn} onClick={() => glide(1)} aria-label={words.next}>
            →
          </button>
        </span>
      </div>
    </div>
  )
}

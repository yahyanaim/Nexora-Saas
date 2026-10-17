"use client"

import { useEffect, useRef } from "react"

/**
 * Turns on scroll reveals for the landing page: every element with
 * `data-reveal` fades up the first time it enters the screen. Content stays
 * visible without JavaScript and with reduced motion.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const root = document.querySelector<HTMLElement>("[data-landing]")
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>("[data-reveal]")]
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.setAttribute("data-shown", "")
          io.unobserve(e.target)
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    )
    // Already on screen at load: show without waiting for a scroll
    const vh = window.innerHeight
    for (const el of items) {
      if (el.getBoundingClientRect().top < vh * 0.92) el.setAttribute("data-shown", "")
      else io.observe(el)
    }
    root.setAttribute("data-anim", "")
    return () => io.disconnect()
  }, [])
  return null
}

/** Counts up to a figure such as "40+", "99.9%" or "12" each time it scrolls into view. */
export function CountUp({ value }: { value: string }) {
  const ref = useRef<HTMLElement>(null)
  const match = value.match(/^([\d.]+)(.*)$/)
  const target = match ? parseFloat(match[1]!) : NaN
  const decimals = match?.[1]?.includes(".") ? match[1].split(".")[1]!.length : 0
  const suffix = match?.[2] ?? ""

  useEffect(() => {
    const el = ref.current
    if (!el || Number.isNaN(target)) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    let raf = 0
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return
      cancelAnimationFrame(raf)
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 1600)
        const eased = 1 - Math.pow(1 - p, 3)
        el.textContent = (target * eased).toFixed(decimals) + suffix
        if (p < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, decimals, suffix])

  return <strong ref={ref}>{value}</strong>
}

/**
 * Scroll-linked motion. Writes `--scroll` (0–1 down the page) on the landing
 * root and `--sp` (0 as an element enters at the bottom, 1 as it leaves at the
 * top) on every `[data-scroll]` element; the CSS turns those into the tilt,
 * parallax and moving text. Throttled to one update a frame; nothing moves
 * with reduced motion.
 */
export function ScrollFX() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const root = document.querySelector<HTMLElement>("[data-landing]")
    if (!root) return
    const items = [...root.querySelectorAll<HTMLElement>("[data-scroll]")]
    let raf = 0
    const update = () => {
      raf = 0
      const vh = window.innerHeight
      const max = Math.max(1, document.documentElement.scrollHeight - vh)
      root.style.setProperty("--scroll", (window.scrollY / max).toFixed(4))
      for (const el of items) {
        const r = el.getBoundingClientRect()
        if (r.bottom < -vh || r.top > vh * 2) continue
        const p = (vh - r.top) / (vh + r.height)
        el.style.setProperty("--sp", Math.min(1, Math.max(0, p)).toFixed(4))
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
    }
  }, [])
  return null
}

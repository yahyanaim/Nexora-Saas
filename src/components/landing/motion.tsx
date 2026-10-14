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

/** Counts up to a figure such as "40+", "99.9%" or "12" when it scrolls into view. */
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
      io.disconnect()
      const start = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 1400)
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

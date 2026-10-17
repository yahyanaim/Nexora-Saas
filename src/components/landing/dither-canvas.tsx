"use client"

import { useEffect, useRef } from "react"

/**
 * Animated ordered-dither artwork in the Nexora blues (steel.dev uses the same
 * pixel-dither language). Draws at one pixel per cell into a small canvas that
 * CSS scales up with `image-rendering: pixelated`, so a frame costs a few
 * thousand writes. Stops when off screen; one still frame with reduced motion.
 *
 * - "field": flowing bands
 * - "skyline": the Nexora skyline over a moving field
 * - "wordmark": the word "nexora" filled with the moving field
 */

type Variant = "field" | "skyline" | "wordmark"

// Light-to-dark Nexora blues (DS-01 blue ramp over the canvas color)
const PALETTE: [number, number, number][] = [
  [0xf4, 0xf8, 0xfc],
  [0xe6, 0xf2, 0xff],
  [0xbf, 0xdf, 0xff],
  [0x82, 0xbe, 0xff],
  [0x4c, 0x9e, 0xff],
  [0x26, 0x84, 0xff],
  [0x12, 0x67, 0xe0],
  [0x0e, 0x4f, 0xb3],
  [0x06, 0x24, 0x55],
]

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
].map((v) => v / 64)

interface Props {
  variant: Variant
  /** Size of one pixel cell in CSS pixels */
  cell?: number
  className?: string
}

export function DitherCanvas({ variant, cell = 6, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let cols = 0
    let rows = 0
    let image: ImageData | null = null
    let mask: Float32Array | null = null // 0..1 per cell (skyline darkness or wordmark coverage)
    let skyline: HTMLImageElement | null = null
    let visible = true
    let raf = 0
    let last = 0
    let t = Math.random() * 100

    const buildMask = () => {
      mask = null
      if (!cols || !rows) return
      const off = document.createElement("canvas")
      off.width = cols
      off.height = rows
      const o = off.getContext("2d", { willReadFrequently: true })
      if (!o) return
      o.fillStyle = "#fff"
      o.fillRect(0, 0, cols, rows)
      if (variant === "skyline" && skyline?.complete && skyline.naturalWidth) {
        const h = rows * 0.92
        const w = (skyline.naturalWidth * h) / skyline.naturalHeight
        for (let x = -w * 0.25; x < cols; x += w * 0.92) o.drawImage(skyline, x, rows - h, w, h)
      } else if (variant === "wordmark") {
        const family = getComputedStyle(canvas).fontFamily || "sans-serif"
        let size = rows * 1.25
        o.font = `600 ${size}px ${family}`
        const width = o.measureText("nexora").width
        if (width > cols * 0.98) size *= (cols * 0.98) / width
        o.font = `600 ${size}px ${family}`
        o.fillStyle = "#000"
        o.textAlign = "center"
        o.textBaseline = "alphabetic"
        o.fillText("nexora", cols / 2, rows * 0.86)
      } else {
        return
      }
      const px = o.getImageData(0, 0, cols, rows).data
      mask = new Float32Array(cols * rows)
      for (let i = 0; i < cols * rows; i++) {
        const l = (0.2126 * px[i * 4]! + 0.7152 * px[i * 4 + 1]! + 0.0722 * px[i * 4 + 2]!) / 255
        mask[i] = 1 - l
      }
    }

    const resize = () => {
      const r = canvas.getBoundingClientRect()
      cols = Math.max(1, Math.ceil(r.width / cell))
      rows = Math.max(1, Math.ceil(r.height / cell))
      canvas.width = cols
      canvas.height = rows
      image = ctx.createImageData(cols, rows)
      buildMask()
      draw()
    }

    const draw = () => {
      if (!image) return
      const d = image.data
      const n = PALETTE.length - 1
      for (let y = 0; y < rows; y++) {
        const fy = y / rows
        for (let x = 0; x < cols; x++) {
          const fx = x / cols
          const i = y * cols + x
          const wave =
            (Math.sin(fx * 7 + t * 0.35 + Math.sin(fy * 5 + t * 0.2) * 1.6) +
              Math.sin(fy * 9 - fx * 3 - t * 0.25) +
              0.6 * Math.sin((fx + fy) * 17 + t * 0.5)) /
            2.6
          let level: number
          if (variant === "field") {
            level = (0.5 + 0.5 * wave) * (0.25 + 0.75 * fy)
          } else if (variant === "skyline") {
            const sky = (mask?.[i] ?? 0) * 1.35
            const field = 0.1 + 0.2 * fy * fy + 0.07 * wave
            level = Math.max(sky, field) * (0.35 + 0.65 * fy)
          } else {
            const m = mask?.[i] ?? 0
            level = m > 0.35 ? 0.35 + 0.55 * (0.5 + 0.5 * wave) : 0
          }
          const v = Math.min(Math.max(level, 0), 1) * n
          const lo = Math.floor(v)
          const idx = Math.min(n, lo + (v - lo > BAYER[(y % 8) * 8 + (x % 8)]! ? 1 : 0))
          const c = PALETTE[idx]!
          const o = i * 4
          d[o] = c[0]
          d[o + 1] = c[1]
          d[o + 2] = c[2]
          // the wordmark sits on the page color, so its background is see-through
          d[o + 3] = variant === "wordmark" && idx === 0 ? 0 : 255
        }
      }
      ctx.putImageData(image, 0, 0)
      // lets the parent hide its no-JS fallback
      canvas.parentElement?.setAttribute("data-ready", "")
    }

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || now - last < 66) return // about 15 frames a second
      t += (now - (last || now)) / 1000
      last = now
      draw()
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
      last = 0
    })
    io.observe(canvas)

    if (variant === "skyline") {
      skyline = new Image()
      skyline.onload = () => {
        buildMask()
        draw()
      }
      skyline.src = "/auth-skyline-blue.png"
    }
    if (variant === "wordmark") document.fonts?.ready.then(() => resize())

    resize()
    if (!reduced) raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [variant, cell])

  return <canvas ref={ref} className={className} aria-hidden />
}

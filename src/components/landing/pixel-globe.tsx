"use client"

import { useEffect, useRef } from "react"
import { useLandingDark } from "./theme"
import s from "./landing.module.css"

/**
 * A rotating pixel globe in the Nexora blues, with arrows that fly from
 * Casablanca to cities around the world. Two canvases: the globe is drawn at
 * one pixel per cell (scaled up with `image-rendering: pixelated`) with
 * ordered dithering, the arrows on a finer layer above it. Land comes from a
 * small equirectangular mask (Natural Earth, public domain). Drag to spin.
 * Stops off screen; a still frame with reduced motion.
 */

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
// Dark page: the same ramp read from the dark canvas (gray.900) up to light blue
const DARK_PALETTE: [number, number, number][] = [
  [0x0d, 0x13, 0x1c],
  [0x0f, 0x1d, 0x30],
  [0x10, 0x2a, 0x4d],
  [0x0e, 0x3b, 0x75],
  [0x12, 0x52, 0xa6],
  [0x1f, 0x6c, 0xd6],
  [0x26, 0x84, 0xff],
  [0x4c, 0x9e, 0xff],
  [0x82, 0xbe, 0xff],
]

const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54,
  22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29,
  53, 21,
].map((v) => v / 64)

const CITY: Record<string, [number, number]> = {
  Casablanca: [33.57, -7.59],
  Paris: [48.86, 2.35],
  London: [51.5, -0.13],
  "New York": [40.71, -74.0],
  Montreal: [45.5, -73.57],
  Dubai: [25.2, 55.27],
  Riyadh: [24.71, 46.68],
  Lagos: [6.52, 3.38],
  Dakar: [14.7, -17.47],
  Nairobi: [-1.29, 36.82],
  "São Paulo": [-23.55, -46.63],
  "Mexico City": [19.43, -99.13],
  "San Francisco": [37.77, -122.42],
  Mumbai: [19.08, 72.88],
  Singapore: [1.35, 103.82],
  Tokyo: [35.68, 139.69],
  Sydney: [-33.87, 151.21],
  Johannesburg: [-26.2, 28.05],
}
const HUB = "Casablanca"
// Casablanca to the world first, then routes on every side of the globe
const ROUTES: [string, string][] = [
  ["Casablanca", "Paris"],
  ["Casablanca", "New York"],
  ["Casablanca", "Dubai"],
  ["Casablanca", "Lagos"],
  ["Casablanca", "São Paulo"],
  ["Casablanca", "London"],
  ["Casablanca", "Riyadh"],
  ["Casablanca", "Montreal"],
  ["Casablanca", "Dakar"],
  ["Casablanca", "Nairobi"],
  ["Dubai", "Mumbai"],
  ["Mumbai", "Singapore"],
  ["Singapore", "Tokyo"],
  ["Tokyo", "Sydney"],
  ["Tokyo", "San Francisco"],
  ["San Francisco", "Mexico City"],
  ["New York", "São Paulo"],
  ["Johannesburg", "Dubai"],
]

const TILT = (-18 * Math.PI) / 180 // north pole leans towards the viewer
const DEG = Math.PI / 180
const SPIN = 0.12 // radians a second (one turn in about 50 s)
const ARC_CYCLE = 5.5 // seconds for one arrow to fly, hold and fade
const ARC_GAP = 0.7 // seconds between two arrows starting
const SPHERE = 0.82 // sphere radius as a share of the half-width; the rest is room for the arrows

type V3 = [number, number, number]

const toBody = (lat: number, lon: number): V3 => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)]
// body -> view: tilt about the x axis
const toView = ([x, y, z]: V3): V3 => [x, y * Math.cos(TILT) - z * Math.sin(TILT), y * Math.sin(TILT) + z * Math.cos(TILT)]

function slerp(a: V3, b: V3, t: number): V3 {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const w = Math.acos(dot)
  if (w < 1e-4) return a
  const s1 = Math.sin((1 - t) * w) / Math.sin(w)
  const s2 = Math.sin(t * w) / Math.sin(w)
  return [a[0] * s1 + b[0] * s2, a[1] * s1 + b[1] * s2, a[2] * s1 + b[2] * s2]
}

export function PixelGlobe({ className }: { className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const globeRef = useRef<HTMLCanvasElement>(null)
  const arcsRef = useRef<HTMLCanvasElement>(null)
  const dark = useLandingDark()

  useEffect(() => {
    const wrap = wrapRef.current
    const globe = globeRef.current
    const arcs = arcsRef.current
    if (!wrap || !globe || !arcs) return
    const g = globe.getContext("2d")
    const a = arcs.getContext("2d")
    if (!g || !a) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    // on the dark page the land glows light blue and the labels sit on dark chips
    const pal = dark ? DARK_PALETTE : PALETTE
    const ink = dark ? { hub: "#e6f2ff", city: "#82beff", chip: "rgba(13,19,28,0.88)", arrow: "#82beff" } : { hub: "#062455", city: "#0e4fb3", chip: "rgba(255,255,255,0.88)", arrow: "#0e4fb3" }
    let mask: Uint8Array | null = null
    const MW = 512
    const MH = 256

    // per-cell geometry, rebuilt on resize
    let D = 0 // globe diameter in cells
    let size = 0 // css px
    let img: ImageData | null = null
    let lat: Float32Array | null = null
    let lon0: Float32Array | null = null
    let light: Float32Array | null = null
    let inside: Uint8Array | null = null

    let rot = -0.3 // start with Morocco, Europe and Africa facing the viewer
    let drag: { x: number; rot: number } | null = null
    let visible = true
    let raf = 0
    let last = 0
    let clock = 0

    const build = () => {
      size = wrap.getBoundingClientRect().width
      const cell = size < 380 ? 3 : 4
      D = Math.max(40, Math.round(size / cell))
      globe.width = D
      globe.height = D
      img = g.createImageData(D, D)
      lat = new Float32Array(D * D)
      lon0 = new Float32Array(D * D)
      light = new Float32Array(D * D)
      inside = new Uint8Array(D * D)
      const L: V3 = [-0.55, 0.55, 0.63]
      const ll = Math.hypot(...L)
      const c = Math.cos(-TILT)
      const sn = Math.sin(-TILT)
      for (let j = 0; j < D; j++) {
        for (let i = 0; i < D; i++) {
          const k = j * D + i
          const nx = (i + 0.5 - D / 2) / ((D / 2) * SPHERE)
          const ny = -((j + 0.5 - D / 2) / ((D / 2) * SPHERE))
          const r2 = nx * nx + ny * ny
          if (r2 > 1) continue
          const nz = Math.sqrt(1 - r2)
          inside[k] = 1
          light[k] = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / ll)
          // view -> body (undo the tilt)
          const by = ny * c - nz * sn
          const bz = ny * sn + nz * c
          lat[k] = Math.asin(Math.max(-1, Math.min(1, by)))
          lon0[k] = Math.atan2(nx, bz)
        }
      }
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      arcs.width = Math.round(size * dpr)
      arcs.height = Math.round(size * dpr)
      a.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const drawGlobe = () => {
      if (!img || !lat || !lon0 || !light || !inside) return
      const d = img.data
      const n = pal.length - 1
      for (let k = 0; k < D * D; k++) {
        const o = k * 4
        if (!inside[k]) {
          d[o + 3] = 0
          continue
        }
        const la = lat[k]!
        let lo = lon0[k]! - rot
        lo = ((((lo + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI
        const mx = Math.min(MW - 1, Math.floor(((lo + Math.PI) / (2 * Math.PI)) * MW))
        const my = Math.min(MH - 1, Math.floor(((Math.PI / 2 - la) / Math.PI) * MH))
        const land = mask ? mask[my * MW + mx]! > 127 : false
        const sh = light[k]!
        let level: number
        if (land) {
          level = 0.84 - sh * 0.36
        } else {
          // ocean, with a faint 30° graticule
          const grid = Math.abs(((la / DEG + 90) % 30) - 15) > 14.2 || Math.abs((((lo / DEG + 180) % 30) + 30) % 30 - 15) > 14.2
          level = 0.3 - sh * 0.22 + (grid ? 0.09 : 0)
        }
        const i = k % D
        const j = (k - i) / D
        const v = Math.min(Math.max(level, 0), 1) * n
        const lo2 = Math.floor(v)
        const idx = Math.min(n, lo2 + (v - lo2 > BAYER[(j % 8) * 8 + (i % 8)]! ? 1 : 0))
        const col = pal[idx]!
        d[o] = col[0]
        d[o + 1] = col[1]
        d[o + 2] = col[2]
        d[o + 3] = 255
      }
      g.putImageData(img, 0, 0)
    }

    // screen position of a body point at altitude h (1 = surface), plus whether it is hidden
    const project = (p: V3, h: number) => {
      const c = Math.cos(rot)
      const sn = Math.sin(rot)
      // spin about the polar axis, then tilt
      const q: V3 = [p[0] * c + p[2] * sn, p[1], -p[0] * sn + p[2] * c]
      const v = toView(q)
      const R = (size / 2) * SPHERE
      const x = size / 2 + v[0] * h * R
      const y = size / 2 - v[1] * h * R
      const hidden = v[2] < 0 && v[0] * v[0] * h * h + v[1] * v[1] * h * h < 1
      return { x, y, hidden, front: v[2] }
    }

    const points: Record<string, V3> = {}
    for (const [name, [la, lo]] of Object.entries(CITY)) points[name] = toBody(la * DEG, lo * DEG)
    // .globe sets the mono family, so the labels match the page's mono type
    const monoFamily = getComputedStyle(wrap).fontFamily

    const drawArcs = () => {
      a.clearRect(0, 0, size, size)
      const unit = Math.max(1.5, size / 300)
      const period = Math.max(ROUTES.length * ARC_GAP, ARC_CYCLE)
      const landed = new Set<string>()

      ROUTES.forEach(([from, to], i) => {
        const A = points[from]!
        const B = points[to]!
        const local = reduced ? 2.2 : (((clock - i * ARC_GAP) % period) + period) % period
        if (local > ARC_CYCLE) return
        const grow = Math.min(1, local / 1.6) // fly
        const fade = local < 4 ? 1 : Math.max(0, 1 - (local - 4) / 1.5)
        const dist = Math.acos(Math.min(1, A[0] * B[0] + A[1] * B[1] + A[2] * B[2]))
        const lift = 0.06 + dist * 0.14
        const steps = 48
        const pts: { x: number; y: number; hidden: boolean }[] = []
        for (let k = 0; k <= Math.round(steps * grow); k++) {
          const t = k / steps
          pts.push(project(slerp(A, B, t), 1 + Math.sin(Math.PI * t) * lift))
        }
        if (pts.length < 2) return
        a.globalAlpha = fade
        a.lineWidth = unit
        a.setLineDash([3 * unit, 2 * unit])
        a.lineDashOffset = -clock * 18
        a.strokeStyle = from === HUB ? "#2684ff" : "#4c9eff"
        a.beginPath()
        let pen = false
        for (const p of pts) {
          if (p.hidden) {
            pen = false
            continue
          }
          if (!pen) a.moveTo(p.x, p.y)
          else a.lineTo(p.x, p.y)
          pen = true
        }
        a.stroke()
        a.setLineDash([])
        // arrowhead at the moving end
        const head = pts[pts.length - 1]!
        const prev = pts[pts.length - 2]!
        if (!head.hidden) {
          const ang = Math.atan2(head.y - prev.y, head.x - prev.x)
          const len = 5.5 * unit
          a.fillStyle = ink.arrow
          a.beginPath()
          a.moveTo(head.x + Math.cos(ang) * len * 0.4, head.y + Math.sin(ang) * len * 0.4)
          a.lineTo(head.x - Math.cos(ang - 0.55) * len, head.y - Math.sin(ang - 0.55) * len)
          a.lineTo(head.x - Math.cos(ang + 0.55) * len, head.y - Math.sin(ang + 0.55) * len)
          a.closePath()
          a.fill()
        }
        // landing pulse
        if (grow >= 1 && !head.hidden) {
          landed.add(to)
          const pulse = Math.min(1, (local - 1.6) / 1.2)
          a.globalAlpha = fade * (1 - pulse)
          a.strokeStyle = "#2684ff"
          a.lineWidth = unit
          const r = (2 + pulse * 7) * unit
          a.strokeRect(head.x - r, head.y - r, r * 2, r * 2)
        }
        a.globalAlpha = 1
      })

      // city squares, and labels for the hub and cities an arrow just reached
      a.font = `500 ${Math.round(Math.max(9, size / 50))}px ${monoFamily}`
      a.textBaseline = "middle"
      for (const [name, p] of Object.entries(points)) {
        const s0 = project(p, 1)
        if (s0.hidden || s0.front < 0.08) continue
        const isHub = name === HUB
        const w = (isHub ? 3.2 : 2.2) * unit
        a.fillStyle = isHub ? ink.hub : ink.city
        a.fillRect(Math.round(s0.x - w / 2), Math.round(s0.y - w / 2), w, w)
        if (isHub || landed.has(name)) {
          const label = name.toUpperCase()
          const tw = a.measureText(label).width
          const lx = s0.x + 6 * unit
          a.globalAlpha = Math.min(1, s0.front * 3)
          a.fillStyle = ink.chip
          a.fillRect(lx - 3, s0.y - 7, tw + 6, 14)
          a.fillStyle = isHub ? ink.hub : ink.city
          a.fillText(label, lx, s0.y + 0.5)
          a.globalAlpha = 1
        }
      }
    }

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      if (!visible) {
        last = 0
        return
      }
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
      if (last && now - last < 33) return // about 30 frames a second
      last = now
      clock += dt
      if (!drag) rot += SPIN * dt
      drawGlobe()
      drawArcs()
    }

    const ro = new ResizeObserver(() => {
      build()
      drawGlobe()
      drawArcs()
    })
    ro.observe(wrap)
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting
    })
    io.observe(wrap)

    const maskImg = new Image()
    maskImg.onload = () => {
      const off = document.createElement("canvas")
      off.width = MW
      off.height = MH
      const o = off.getContext("2d", { willReadFrequently: true })
      if (!o) return
      o.drawImage(maskImg, 0, 0, MW, MH)
      const px = o.getImageData(0, 0, MW, MH).data
      mask = new Uint8Array(MW * MH)
      for (let k = 0; k < MW * MH; k++) mask[k] = px[k * 4]!
      wrap.setAttribute("data-ready", "")
      drawGlobe()
      drawArcs()
    }
    maskImg.src = "/landing/earth-mask.webp"

    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, rot }
      wrap.setPointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!drag) return
      rot = drag.rot + ((e.clientX - drag.x) / Math.max(1, size)) * Math.PI
      if (reduced) {
        drawGlobe()
        drawArcs()
      }
    }
    const onUp = () => {
      drag = null
    }
    wrap.addEventListener("pointerdown", onDown)
    wrap.addEventListener("pointermove", onMove)
    wrap.addEventListener("pointerup", onUp)
    wrap.addEventListener("pointercancel", onUp)

    build()
    drawGlobe()
    drawArcs()
    if (!reduced) raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      wrap.removeEventListener("pointerdown", onDown)
      wrap.removeEventListener("pointermove", onMove)
      wrap.removeEventListener("pointerup", onUp)
      wrap.removeEventListener("pointercancel", onUp)
    }
  }, [dark])

  return (
    <div
      ref={wrapRef}
      className={`${s.globe} ${className ?? ""}`}
      role="img"
      aria-label="A rotating globe with arrows flying from Casablanca to cities around the world"
    >
      <canvas ref={globeRef} className={s.globeCanvas} />
      <canvas ref={arcsRef} className={s.globeArcs} />
    </div>
  )
}

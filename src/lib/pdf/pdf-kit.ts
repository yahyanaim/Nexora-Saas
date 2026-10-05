import type { jsPDF } from "jspdf"
import type { CompanySettings } from "@/types/work-settings"

/**
 * Shared design kit for every PDF Nexora produces (invoices, receipts, reports):
 * one palette, one letterhead, one footer with page numbers, so documents look
 * like they come from the same company. Units are millimetres (A4).
 */

export type RGB = [number, number, number]
export type Tone = "neutral" | "info" | "success" | "warning" | "danger"

export const INK: RGB = [15, 23, 42]
export const BODY: RGB = [51, 65, 85]
export const MUTED: RGB = [100, 116, 139]
export const LINE: RGB = [226, 232, 240]
export const SOFT: RGB = [248, 250, 252]
export const WHITE: RGB = [255, 255, 255]
/** The ERP's own chart palette (globals.css --chart-1…5), so documents match the app. */
export const ERP_CHART = {
  blue: [38, 132, 255] as RGB, // --chart-1 #2684ff
  sky: [130, 190, 255] as RGB, // --chart-2 #82beff
  green: [47, 191, 113] as RGB, // --chart-3 #2fbf71
  amber: [245, 184, 61] as RGB, // --chart-4 #f5b83d
  slate: [125, 141, 160] as RGB, // --chart-5 #7d8da0
}
export const DEFAULT_BRAND: RGB = ERP_CHART.blue
export const ERP_BRAND_HEX = "#2684ff"

// Text colours are the chart hues darkened for contrast on white; backgrounds are light tints of them
const TONES: Record<Tone, { fg: RGB; bg: RGB }> = {
  neutral: { fg: [83, 97, 116], bg: [238, 242, 246] },
  info: { fg: [24, 104, 214], bg: [222, 236, 255] },
  success: { fg: [27, 135, 78], bg: [222, 245, 233] },
  warning: { fg: [176, 116, 12], bg: [254, 243, 216] },
  danger: { fg: [200, 40, 40], bg: [253, 228, 228] },
}
export const toneColors = (tone: Tone) => TONES[tone]

export function hexToRgb(hex: string | undefined, fallback: RGB = DEFAULT_BRAND): RGB {
  const m = hex?.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : fallback
}

/** Colours the demo used to seed before documents followed the ERP palette. */
const LEGACY_SEED_COLOURS = ["#2563eb", "#7c3aed"]

/** Brand colour for documents: the company's own choice, otherwise the ERP blue. */
export function documentBrandHex(hex: string | undefined) {
  return !hex || LEGACY_SEED_COLOURS.includes(hex.toLowerCase()) ? ERP_BRAND_HEX : hex
}
export const documentBrand = (hex: string | undefined): RGB => hexToRgb(documentBrandHex(hex))

/** Mixes a colour with white: 0 = the colour, 1 = white. */
export function tint(c: RGB, amount: number): RGB {
  return c.map((v) => Math.round(v + (255 - v) * amount)) as RGB
}

/**
 * jsPDF's built-in fonts only cover Latin-1. Replace the typographic characters
 * Intl and translations produce (narrow spaces, minus, dashes, quotes, arrows)
 * with safe equivalents so nothing prints as gibberish.
 */
export function clean(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/[    ]/g, " ")
    .replace(/[−‒–—]/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„«»]/g, '"')
    .replace(/…/g, "...")
    .replace(/→/g, "->")
    .replace(/←/g, "<-")
    .replace(/•/g, "·")
}

// ── Font: Inter, the ERP's typeface (public/fonts, SIL OFL), with Helvetica as fallback ──
const FAMILY = new WeakMap<jsPDF, string>()
/** Font family to use with doc.setFont and autoTable styles. */
export const fontOf = (doc: jsPDF) => FAMILY.get(doc) ?? "helvetica"

let interData: Promise<{ regular: string; bold: string } | null> | null = null

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

async function loadInter() {
  if (typeof window === "undefined" || typeof fetch === "undefined") return null
  try {
    const [regular, bold] = await Promise.all(
      ["/fonts/inter-400.ttf", "/fonts/inter-700.ttf"].map(async (url) => {
        const res = await fetch(url)
        if (!res.ok) throw new Error(url)
        return toBase64(await res.arrayBuffer())
      })
    )
    return { regular: regular!, bold: bold! }
  } catch {
    interData = null // try again next time
    return null
  }
}

export async function createPdf(orientation: "portrait" | "landscape" = "portrait") {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation, unit: "mm", format: "a4", compress: true })
  doc.setLineHeightFactor(1.3)
  const inter = await (interData ??= loadInter())
  if (inter) {
    doc.addFileToVFS("Inter-Regular.ttf", inter.regular)
    doc.addFileToVFS("Inter-Bold.ttf", inter.bold)
    doc.addFont("Inter-Regular.ttf", "Inter", "normal")
    doc.addFont("Inter-Bold.ttf", "Inter", "bold")
    // Inter ships no italic here; italic text uses the regular face
    doc.addFont("Inter-Regular.ttf", "Inter", "italic")
    FAMILY.set(doc, "Inter")
  }
  return { doc, autoTable }
}

export const pageSize = (doc: jsPDF) => ({ w: doc.internal.pageSize.getWidth(), h: doc.internal.pageSize.getHeight() })

/** Loads a logo image; without a source, documents show the company initials instead. */
export async function loadLogo(src?: string): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined" || !src) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export function setText(doc: jsPDF, size: number, color: RGB, style: "normal" | "bold" = "normal") {
  doc.setFont(fontOf(doc), style)
  doc.setFontSize(size)
  doc.setTextColor(...color)
}

/** Writes text, shrinking the font until it fits the width. Returns the size used. */
export function fitText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, size: number, opts: { align?: "left" | "right" | "center" } = {}) {
  let s = size
  doc.setFontSize(s)
  while (s > 6 && doc.getTextWidth(text) > maxWidth) doc.setFontSize((s -= 0.5))
  doc.text(text, x, y, { align: opts.align })
  return s
}

/** Small rounded label (status, chip). x is the left edge, or the right edge with align "right". Returns its width. */
export function pill(doc: jsPDF, text: string, x: number, y: number, tone: Tone | { fg: RGB; bg: RGB }, opts: { align?: "left" | "right"; size?: number } = {}) {
  const { fg, bg } = typeof tone === "string" ? TONES[tone] : tone
  const size = opts.size ?? 7.5
  setText(doc, size, fg, "bold")
  const label = clean(text).toUpperCase()
  const w = doc.getTextWidth(label) + 6
  const h = size * 0.3528 + 3.2
  const left = opts.align === "right" ? x - w : x
  doc.setFillColor(...bg)
  doc.roundedRect(left, y - h + 1.2, w, h, h / 2, h / 2, "F")
  doc.text(label, left + 3, y - 0.2)
  return w
}

/** Company letters, for the logo tile when no image is available. */
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("")

/** Logo tile: the image on a white rounded square, or the company initials on the brand colour. */
export function logoTile(doc: jsPDF, logo: HTMLImageElement | null, name: string, x: number, y: number, size: number, brand: RGB, onDark = false) {
  if (logo) {
    if (onDark) {
      doc.setFillColor(...WHITE)
      doc.roundedRect(x, y, size, size, 2.5, 2.5, "F")
    }
    try {
      // Fit the image in the square without stretching it
      const pad = onDark ? size * 0.14 : 0
      const box = size - pad * 2
      const ratio = logo.naturalWidth && logo.naturalHeight ? logo.naturalWidth / logo.naturalHeight : 1
      const iw = ratio >= 1 ? box : box * ratio
      const ih = ratio >= 1 ? box / ratio : box
      const format = logo.src.startsWith("data:image/jpeg") ? "JPEG" : "PNG"
      doc.addImage(logo, format, x + pad + (box - iw) / 2, y + pad + (box - ih) / 2, iw, ih)
      return
    } catch {
      // fall back to initials
    }
  }
  doc.setFillColor(...(onDark ? WHITE : brand))
  doc.roundedRect(x, y, size, size, 2.5, 2.5, "F")
  setText(doc, size * 1.25, onDark ? brand : WHITE, "bold")
  doc.text(initials(name), x + size / 2, y + size / 2 + size * 0.15, { align: "center" })
}

/** The lines that identify a company: address, contacts and registration numbers. */
export function companyLines(company: Partial<CompanySettings> | undefined) {
  if (!company) return []
  return [
    [company.address, company.city, company.country].filter(Boolean).join(", "),
    [company.phone, company.email, company.website].filter(Boolean).join("  ·  "),
    [company.ice && `ICE ${company.ice}`, company.taxId && `IF ${company.taxId}`, company.tradeRegister && `RC ${company.tradeRegister}`]
      .filter(Boolean)
      .join("  ·  "),
  ]
    .filter(Boolean)
    .map(clean)
}

/** One-line legal mention for footers. */
export function legalLine(company: Partial<CompanySettings> | undefined, fallbackName: string) {
  const name = company?.legalName || fallbackName
  return clean(
    [
      name,
      [company?.address, company?.city].filter(Boolean).join(", "),
      company?.ice && `ICE ${company.ice}`,
      company?.taxId && `IF ${company.taxId}`,
      company?.tradeRegister && `RC ${company.tradeRegister}`,
      company?.shareCapital && `Capital ${company.shareCapital}`,
    ]
      .filter(Boolean)
      .join("  ·  ")
  )
}

/**
 * Footer on every page: a hairline, an optional note, the legal line and
 * "page x / y". Call once, after all content is drawn.
 */
export function drawFooters(doc: jsPDF, opts: { note?: string; legal?: string; left?: string; pageLabel?: (page: number, total: number) => string; margin?: number }) {
  const { w, h } = pageSize(doc)
  const margin = opts.margin ?? 16
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(margin, h - 16, w - margin, h - 16)
    const label = clean(opts.pageLabel ? opts.pageLabel(i, total) : `${i} / ${total}`)
    setText(doc, 7, MUTED, "bold")
    doc.text(label, w - margin, h - 11.5, { align: "right" })
    const labelW = doc.getTextWidth(label) + 6
    const left = [opts.left, opts.note].filter(Boolean).join("  ·  ")
    if (left) {
      setText(doc, 7, MUTED)
      const lines = doc.splitTextToSize(clean(left), w - margin * 2 - labelW) as string[]
      doc.text(lines[0] ?? "", margin, h - 11.5)
      if (lines[1]) doc.text(lines.slice(1).join(" "), margin, h - 8.3, { maxWidth: w - margin * 2 - labelW })
    }
    if (opts.legal) {
      setText(doc, 6.3, [148, 163, 184])
      fitText(doc, opts.legal, w / 2, h - 4.5, w - margin * 2, 6.3, { align: "center" })
    }
  }
}

/** Runs `draw` on every page after the first (slim continuation headers). */
export function onLaterPages(doc: jsPDF, draw: () => void) {
  const total = doc.getNumberOfPages()
  for (let i = 2; i <= total; i++) {
    doc.setPage(i)
    draw()
  }
}

/** Large diagonal stamp across every page (DRAFT, PAID, CANCELLED). */
export function watermark(doc: jsPDF, text: string, color: RGB) {
  const { w, h } = pageSize(doc)
  const total = doc.getNumberOfPages()
  const GState = (doc as unknown as { GState: new (o: { opacity: number }) => unknown }).GState
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const d = doc as unknown as { setGState: (g: unknown) => void }
    d.setGState(new GState({ opacity: 0.07 }))
    setText(doc, 96, color, "bold")
    doc.text(clean(text).toUpperCase(), w / 2, h / 2 + 20, { align: "center", angle: 32 })
    d.setGState(new GState({ opacity: 1 }))
  }
}

/** Adds a page when fewer than `needed` mm are left above the footer. Returns the y to continue at. */
export function ensureSpace(doc: jsPDF, y: number, needed: number, top = 20) {
  const { h } = pageSize(doc)
  if (y + needed <= h - 22) return y
  doc.addPage()
  return top
}

export function sectionTitle(doc: jsPDF, text: string, x: number, y: number, brand: RGB, width?: number) {
  doc.setFillColor(...brand)
  doc.roundedRect(x, y - 3.3, 1.2, 4.2, 0.6, 0.6, "F")
  setText(doc, 10.5, INK, "bold")
  doc.text(clean(text), x + 3.5, y)
  if (width) {
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(x + 3.5 + doc.getTextWidth(clean(text)) + 3, y - 1.2, x + width, y - 1.2)
  }
}

export interface Tile {
  label: string
  value: string
  /** Second line, e.g. "+12% vs previous" */
  note?: string
  noteTone?: Tone
}

/** A row (or grid) of KPI tiles with an accent strip on top. Returns the y below them. */
export function tiles(doc: jsPDF, items: Tile[], x: number, y: number, width: number, brand: RGB, cols = 4, height = 21) {
  const gap = 3.5
  const tileW = (width - gap * (cols - 1)) / cols
  items.forEach((tile, i) => {
    const tx = x + (i % cols) * (tileW + gap)
    const ty = y + Math.floor(i / cols) * (height + gap)
    doc.setFillColor(...WHITE)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.25)
    doc.roundedRect(tx, ty, tileW, height, 2.2, 2.2, "FD")
    doc.setFillColor(...brand)
    doc.rect(tx + 4, ty, 10, 0.9, "F")
    setText(doc, 7, MUTED, "bold")
    doc.text(clean(tile.label).toUpperCase(), tx + 4, ty + 6.2, { maxWidth: tileW - 8 })
    setText(doc, 13, INK, "bold")
    fitText(doc, clean(tile.value), tx + 4, ty + 13.4, tileW - 8, 13)
    if (tile.note) {
      setText(doc, 7, tile.noteTone ? TONES[tile.noteTone].fg : MUTED)
      doc.text(clean(tile.note), tx + 4, ty + 18, { maxWidth: tileW - 8 })
    }
  })
  return y + Math.ceil(items.length / cols) * (height + gap) - gap
}

/** Rounded chips such as "Period: Sep 2026". Returns the y below them. */
export function chips(doc: jsPDF, items: [string, string][], x: number, y: number, maxWidth: number, brand: RGB) {
  let cx = x
  let cy = y
  for (const [label, value] of items) {
    const l = clean(label)
    const v = clean(value)
    setText(doc, 7.5, MUTED)
    const lw = doc.getTextWidth(`${l}: `)
    setText(doc, 7.5, INK, "bold")
    const w = lw + doc.getTextWidth(v) + 7
    if (cx + w > x + maxWidth) {
      cx = x
      cy += 7.5
    }
    doc.setFillColor(...tint(brand, 0.92))
    doc.roundedRect(cx, cy - 4.2, w, 6, 3, 3, "F")
    setText(doc, 7.5, MUTED)
    doc.text(`${l}: `, cx + 3.5, cy)
    setText(doc, 7.5, INK, "bold")
    doc.text(v, cx + 3.5 + lw, cy)
    cx += w + 2.5
  }
  return cy + 4
}

/**
 * Vertical bar chart with gridlines, axis labels and an optional comparison
 * series drawn as lighter bars behind. Returns the y below it.
 */
export function barChart(
  doc: jsPDF,
  opts: {
    x: number
    y: number
    w: number
    h: number
    values: number[]
    compare?: number[]
    labels: string[]
    brand: RGB
    format: (n: number) => string
    legend?: [string, string]
  }
) {
  const { x, y, w, h, values, labels, brand, format } = opts
  const axisW = 18
  const plotX = x + axisW
  const plotW = w - axisW
  const plotH = h - 8
  const all = [...values, ...(opts.compare ?? [])]
  const rawMax = Math.max(1, ...all)
  const magnitude = 10 ** Math.floor(Math.log10(rawMax))
  const max = Math.ceil(rawMax / magnitude) * magnitude
  doc.setLineWidth(0.15)
  for (let i = 0; i <= 4; i++) {
    const gy = y + plotH - (plotH * i) / 4
    doc.setDrawColor(...(i === 0 ? [203, 213, 225] as RGB : LINE))
    doc.line(plotX, gy, plotX + plotW, gy)
    setText(doc, 6, MUTED)
    doc.text(clean(format((max * i) / 4)), plotX - 2, gy + 1, { align: "right" })
  }
  const step = plotW / Math.max(1, values.length)
  const barW = Math.min(9, step * 0.62)
  const labelEvery = Math.max(1, Math.ceil(values.length / 12))
  values.forEach((v, i) => {
    const cx = plotX + i * step + step / 2
    const prev = opts.compare?.[i]
    if (prev !== undefined && prev > 0) {
      const ph = (prev / max) * plotH
      doc.setFillColor(...tint(brand, 0.75))
      doc.roundedRect(cx - barW / 2 - barW * 0.18, y + plotH - ph, barW, ph, 0.8, 0.8, "F")
    }
    const bh = (Math.max(0, v) / max) * plotH
    if (bh > 0) {
      doc.setFillColor(...brand)
      doc.roundedRect(cx - barW / 2 + (prev !== undefined ? barW * 0.18 : 0), y + plotH - bh, barW, bh, 0.8, 0.8, "F")
    }
    if (i % labelEvery === 0) {
      setText(doc, 6, MUTED)
      doc.text(clean(labels[i] ?? ""), cx, y + plotH + 4, { align: "center" })
    }
  })
  if (opts.legend) {
    const [cur, cmp] = opts.legend
    const ly = y - 3
    setText(doc, 6.5, MUTED)
    let lx = x + w
    for (const [label, color] of [[cmp, tint(brand, 0.75)], [cur, brand]] as [string, RGB][]) {
      if (!label) continue
      const tw = doc.getTextWidth(clean(label))
      lx -= tw
      doc.text(clean(label), lx, ly)
      lx -= 4
      doc.setFillColor(...color)
      doc.roundedRect(lx, ly - 2.4, 2.6, 2.6, 0.6, 0.6, "F")
      lx -= 5
    }
  }
  return y + h
}

/** Horizontal bars with label, value and share, e.g. revenue by client. Returns the y below. */
export function hBars(doc: jsPDF, rows: { label: string; value: number; display: string }[], x: number, y: number, w: number, brand: RGB) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const labelW = w * 0.34
  const valueW = 24
  const barMax = w - labelW - valueW - 4
  rows.forEach((r, i) => {
    const ry = y + i * 7
    setText(doc, 8, BODY)
    doc.text(clean(r.label), x, ry + 3, { maxWidth: labelW - 2 })
    doc.setFillColor(...tint(brand, 0.9))
    doc.roundedRect(x + labelW, ry, barMax, 4, 1.2, 1.2, "F")
    const bw = Math.max(1.5, (Math.max(0, r.value) / max) * barMax)
    doc.setFillColor(...brand)
    doc.roundedRect(x + labelW, ry, bw, 4, 1.2, 1.2, "F")
    setText(doc, 8, INK, "bold")
    doc.text(clean(r.display), x + w, ry + 3.1, { align: "right" })
  })
  return y + rows.length * 7
}

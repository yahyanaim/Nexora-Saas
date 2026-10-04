import type { CellHookData } from "jspdf-autotable"
import type { JsPDFWithAutoTable } from "@/types/pdf"
import {
  BODY,
  INK,
  LINE,
  MUTED,
  SOFT,
  WHITE,
  clean,
  createPdf,
  drawFooters,
  ensureSpace,
  fitText,
  logoTile,
  onLaterPages,
  pageSize,
  pill,
  setText,
  tint,
  toneColors,
  watermark,
  type RGB,
  type Tone,
} from "./pdf-kit"

/**
 * One professional layout for every billing document: client invoices, credit
 * notes, subscription invoices and payment receipts. Callers map their data to
 * this model, with every label already translated.
 */
export interface InvoiceDocument {
  brand: RGB
  logo: HTMLImageElement | null
  /** INVOICE, CREDIT NOTE, RECEIPT… */
  title: string
  number: string
  status?: { label: string; tone: Tone }
  /** Big faint stamp across the page */
  stamp?: { text: string; tone: Tone }
  seller: { name: string; lines: string[] }
  buyer: { label: string; name: string; lines: string[] }
  /** Dates, terms, references: label → value */
  meta: [string, string][]
  /** The highlighted figure in the header (amount due, amount paid) */
  highlight: { label: string; value: string; note?: string }
  columns: { item: string; quantity: string; unitPrice: string; tax?: string; amount: string }
  items: { title: string; detail?: string; quantity: string; unitPrice: string; tax?: string; amount: string }[]
  /** Subtotal, taxes, withholding… then the total (strong) */
  totals: { label: string; value: string; strong?: boolean }[]
  /** Filled band under the totals, e.g. Balance due */
  due?: { label: string; value: string }
  /** Extra tables under the lines, e.g. payments received */
  tables?: { title: string; head: string[]; rows: string[][]; alignRight?: number[] }[]
  payment?: { title: string; rows: [string, string][] }
  notes?: { title: string; text: string }
  /** Small print under the notes (exchange rate, legal reference) */
  smallPrint?: string[]
  footer: { note?: string; legal: string; pageLabel: (page: number, total: number) => string }
  filename: string
}

const MARGIN = 16

export async function renderInvoiceDocument(model: InvoiceDocument, opts: { save?: boolean } = {}) {
  const { doc, autoTable } = await createPdf("portrait")
  const pdf = doc as unknown as JsPDFWithAutoTable
  const { w } = pageSize(doc)
  const brand = model.brand
  const right = w - MARGIN
  const contentW = w - MARGIN * 2

  // ── Letterhead ────────────────────────────────────────────────────
  doc.setFillColor(...brand)
  doc.rect(0, 0, w, 3, "F")
  doc.setFillColor(...tint(brand, 0.55))
  doc.rect(0, 3, w, 0.8, "F")

  let y = 14
  logoTile(doc, model.logo, model.seller.name, MARGIN, y, 15, brand)
  setText(doc, 14, INK, "bold")
  doc.text(clean(model.seller.name), MARGIN + 19, y + 5.5, { maxWidth: 92 })
  setText(doc, 7.5, MUTED)
  model.seller.lines.slice(0, 4).forEach((line, i) => doc.text(clean(line), MARGIN + 19, y + 10.5 + i * 3.7, { maxWidth: 95 }))

  setText(doc, 24, brand, "bold")
  doc.text(clean(model.title).toUpperCase(), right, y + 7, { align: "right" })
  setText(doc, 10.5, INK, "bold")
  doc.text(clean(model.number), right, y + 13.5, { align: "right" })
  if (model.status) pill(doc, model.status.label, right, y + 21, model.status.tone, { align: "right" })

  y = Math.max(y + 26, y + 10.5 + Math.min(4, model.seller.lines.length) * 3.7 + 4)
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.25)
  doc.line(MARGIN, y, right, y)
  y += 6

  // ── Bill-to · details · highlighted amount ────────────────────────
  const gap = 4
  const buyerW = 74
  const metaW = 54
  const hiW = contentW - buyerW - metaW - gap * 2
  const buyerLines = model.buyer.lines.filter(Boolean).slice(0, 5)
  const panelH = Math.max(34, 15 + buyerLines.length * 4, 9 + model.meta.length * 6.4)

  // Bill to
  doc.setFillColor(...SOFT)
  doc.roundedRect(MARGIN, y, buyerW, panelH, 2.5, 2.5, "F")
  setText(doc, 6.8, brand, "bold")
  doc.text(clean(model.buyer.label).toUpperCase(), MARGIN + 5, y + 6.5)
  setText(doc, 11, INK, "bold")
  doc.text(clean(model.buyer.name), MARGIN + 5, y + 12.5, { maxWidth: buyerW - 10 })
  setText(doc, 8, BODY)
  buyerLines.forEach((line, i) => doc.text(clean(line), MARGIN + 5, y + 17.5 + i * 4, { maxWidth: buyerW - 10 }))

  // Details
  const mx = MARGIN + buyerW + gap
  doc.setDrawColor(...LINE)
  doc.roundedRect(mx, y, metaW, panelH, 2.5, 2.5, "S")
  model.meta.forEach(([label, value], i) => {
    const ry = y + 7 + i * 6.4
    setText(doc, 7, MUTED)
    doc.text(clean(label), mx + 4.5, ry)
    setText(doc, 8.2, INK, "bold")
    fitText(doc, clean(value), mx + metaW - 4.5, ry, metaW / 2, 8.2, { align: "right" })
  })

  // Highlight
  const hx = mx + metaW + gap
  doc.setFillColor(...brand)
  doc.roundedRect(hx, y, hiW, panelH, 2.5, 2.5, "F")
  setText(doc, 7, tint(brand, 0.75), "bold")
  doc.text(clean(model.highlight.label).toUpperCase(), hx + 5, y + 8)
  setText(doc, 17, WHITE, "bold")
  fitText(doc, clean(model.highlight.value), hx + 5, y + panelH / 2 + 4, hiW - 10, 17)
  if (model.highlight.note) {
    setText(doc, 7.5, tint(brand, 0.8))
    doc.text(clean(model.highlight.note), hx + 5, y + panelH - 5.5, { maxWidth: hiW - 10 })
  }
  y += panelH + 8

  // ── Line items ────────────────────────────────────────────────────
  const hasTax = model.items.some((i) => i.tax) && !!model.columns.tax
  const details = new Map<number, string>()
  model.items.forEach((item, i) => item.detail && details.set(i, clean(item.detail)))
  const head = [["#", model.columns.item, model.columns.quantity, model.columns.unitPrice, ...(hasTax ? [model.columns.tax!] : []), model.columns.amount].map(clean)]
  const body = model.items.map((item, i) => [
    String(i + 1),
    // A blank second line leaves room for the detail, drawn in grey below
    details.has(i) ? `${clean(item.title)}\n ` : clean(item.title),
    clean(item.quantity),
    clean(item.unitPrice),
    ...(hasTax ? [clean(item.tax ?? "")] : []),
    clean(item.amount),
  ])
  const amountCol = hasTax ? 5 : 4
  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: MARGIN, right: MARGIN, top: 18, bottom: 26 },
    theme: "plain",
    styles: { font: "helvetica", fontSize: 8.6, textColor: INK, cellPadding: { top: 3, bottom: 3, left: 2.5, right: 2.5 }, valign: "top", lineColor: LINE },
    headStyles: { fillColor: brand, textColor: WHITE, fontStyle: "bold", fontSize: 7.8, cellPadding: { top: 3.2, bottom: 3.2, left: 2.5, right: 2.5 } },
    bodyStyles: { lineWidth: { bottom: 0.2 } },
    alternateRowStyles: { fillColor: SOFT },
    columnStyles: {
      0: { cellWidth: 9, textColor: MUTED, halign: "center" },
      2: { cellWidth: 20, halign: "right" },
      3: { cellWidth: 28, halign: "right" },
      ...(hasTax ? { 4: { cellWidth: 16, halign: "right" as const } } : {}),
      [amountCol]: { cellWidth: 30, halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data: CellHookData) => {
      if (data.section === "head" && data.column.index >= 2) data.cell.styles.halign = "right"
      if (data.section === "head" && data.column.index === 0) data.cell.styles.halign = "center"
    },
    didDrawCell: (data: CellHookData) => {
      if (data.section !== "body" || data.column.index !== 1) return
      const detail = details.get(data.row.index)
      if (!detail) return
      const lines = data.cell.text
      const lineH = (8.6 * 0.3528 * 1.3)
      const baseY = data.cell.y + 3 + lineH * (lines.length - 1) + 2.4
      setText(doc, 7.2, MUTED)
      doc.text(doc.splitTextToSize(detail, data.cell.width - 5)[0] as string, data.cell.x + 2.5, baseY)
    },
  })
  y = (pdf.lastAutoTable?.finalY ?? y) + 7

  // ── Payment details · notes (left) and totals (right) ─────────────
  const totalsW = 76
  const totalsX = right - totalsW
  const leftW = contentW - totalsW - 8
  const totalsH = model.totals.length * 6.6 + (model.due ? 15 : 2)
  const payH = model.payment ? 9 + model.payment.rows.length * 5 + 3 : 0
  y = ensureSpace(doc, y, Math.max(totalsH, payH) + 4)
  const top = y

  model.totals.forEach((row, i) => {
    const ry = top + 4 + i * 6.6
    if (row.strong) {
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.25)
      doc.line(totalsX, ry - 4.4, right, ry - 4.4)
    }
    setText(doc, row.strong ? 10 : 8.5, row.strong ? INK : MUTED, row.strong ? "bold" : "normal")
    doc.text(clean(row.label), totalsX + 2, ry, { maxWidth: totalsW - 34 })
    setText(doc, row.strong ? 10.5 : 8.8, INK, row.strong ? "bold" : "normal")
    doc.text(clean(row.value), right - 2, ry, { align: "right" })
  })
  let totalsBottom = top + model.totals.length * 6.6
  if (model.due) {
    const by = totalsBottom + 1.5
    doc.setFillColor(...brand)
    doc.roundedRect(totalsX, by, totalsW, 11, 2, 2, "F")
    setText(doc, 8.5, WHITE, "bold")
    doc.text(clean(model.due.label).toUpperCase(), totalsX + 4, by + 7)
    setText(doc, 12, WHITE, "bold")
    fitText(doc, clean(model.due.value), right - 4, by + 7.3, totalsW - 40, 12, { align: "right" })
    totalsBottom = by + 11
  }

  let leftY = top
  if (model.payment) {
    doc.setFillColor(...tint(brand, 0.93))
    doc.roundedRect(MARGIN, leftY, leftW, payH, 2.5, 2.5, "F")
    setText(doc, 7, brand, "bold")
    doc.text(clean(model.payment.title).toUpperCase(), MARGIN + 5, leftY + 6.5)
    model.payment.rows.forEach(([label, value], i) => {
      const ry = leftY + 12 + i * 5
      setText(doc, 7.6, MUTED)
      doc.text(clean(label), MARGIN + 5, ry)
      setText(doc, 7.8, INK, "bold")
      doc.text(clean(value), MARGIN + 30, ry, { maxWidth: leftW - 34 })
    })
    leftY += payH + 5
  }
  if (model.notes?.text) {
    setText(doc, 7, MUTED, "bold")
    doc.text(clean(model.notes.title).toUpperCase(), MARGIN, leftY + 3)
    setText(doc, 8, BODY)
    const lines = doc.splitTextToSize(clean(model.notes.text), leftW) as string[]
    doc.text(lines.slice(0, 8), MARGIN, leftY + 8)
    leftY += 8 + Math.min(8, lines.length) * 3.9
  }
  y = Math.max(leftY, totalsBottom) + 8

  // ── Extra tables (payments received…) ─────────────────────────────
  for (const table of model.tables ?? []) {
    if (!table.rows.length) continue
    y = ensureSpace(doc, y, 22)
    setText(doc, 7, MUTED, "bold")
    doc.text(clean(table.title).toUpperCase(), MARGIN, y)
    autoTable(doc, {
      startY: y + 2,
      head: [table.head.map(clean)],
      body: table.rows.map((r) => r.map(clean)),
      margin: { left: MARGIN, right: MARGIN, bottom: 26 },
      theme: "plain",
      styles: { fontSize: 8, textColor: INK, cellPadding: 2, lineColor: LINE, lineWidth: { bottom: 0.2 } },
      headStyles: { textColor: MUTED, fontStyle: "bold", fontSize: 7.2, fillColor: SOFT },
      columnStyles: Object.fromEntries((table.alignRight ?? []).map((c) => [c, { halign: "right" as const }])),
    })
    y = (pdf.lastAutoTable?.finalY ?? y) + 8
  }

  if (model.smallPrint?.length) {
    y = ensureSpace(doc, y, model.smallPrint.length * 4 + 2)
    setText(doc, 7, MUTED)
    model.smallPrint.forEach((line, i) => doc.text(clean(line), MARGIN, y + i * 3.8, { maxWidth: contentW }))
  }

  onLaterPages(doc, () => {
    doc.setFillColor(...brand)
    doc.rect(0, 0, w, 2, "F")
    setText(doc, 8, MUTED, "bold")
    doc.text(clean(`${model.title} ${model.number}`), MARGIN, 11)
    doc.text(clean(model.buyer.name), right, 11, { align: "right" })
  })
  if (model.stamp) watermark(doc, model.stamp.text, toneColors(model.stamp.tone).fg)
  drawFooters(doc, { note: model.footer.note, legal: model.footer.legal, pageLabel: model.footer.pageLabel, margin: MARGIN })
  if (opts.save !== false) doc.save(model.filename)
  return doc
}

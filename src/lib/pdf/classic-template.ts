import type { JsPDFWithAutoTable } from "@/types/pdf"
import { BODY, INK, MUTED, WHITE, clean, createPdf, fitText, fontOf, logoTile, onLaterPages, pageSize, setText, tint, toneColors, watermark, type RGB, type Tone } from "./pdf-kit"

/**
 * The "classic" layout of quotes and invoices, modelled on the French /
 * Moroccan devis, drawn in the ERP's colours and font: a title bar, references on the right, "on behalf of"
 * and "addressed to" panels, a project description box, a bordered line
 * table with a unit column, notes and bank details next to the totals, the
 * net amount to pay, a "Bon pour accord" signature box and the legal footer.
 */
export interface ClassicDocument {
  brand: RGB
  logo: HTMLImageElement | null
  companyName: string
  title: string
  status?: { label: string; tone: Tone }
  stamp?: { text: string; tone: Tone }
  /** Client no., date, number, expiry… */
  refs: [string, string][]
  from: { heading: string; rows: [string, string][] }
  to: { heading: string; rows: [string, string][] }
  subject?: { heading: string; text: string }
  columns: { description: string; unitPrice: string; quantity: string; total: string }
  items: { description: string; unitPrice: string; quantity: string; unit: string; total: string }[]
  notes: { heading: string; rows: [string, string][] }
  totals: { label: string; value: string; strong?: boolean }[]
  net: { label: string; value: string }
  signature?: { label: string; hint: string }
  legal: string
  terms?: string
  pageLabel: (page: number, total: number) => string
  filename: string
}

const M = 18
// Light rules for the table and lines; bars and panels follow the brand colour
const RULE: RGB = [203, 213, 225]

function bar(doc: Parameters<typeof setText>[0], brand: RGB, x: number, y: number, w: number, text: string, align: "left" | "center" = "left") {
  doc.setFillColor(...brand)
  doc.roundedRect(x, y, w, 5.6, 1, 1, "F")
  setText(doc, 7, WHITE, "bold")
  doc.text(clean(text).toUpperCase(), align === "center" ? x + w / 2 : x + 2.2, y + 3.85, { align })
}

export async function renderClassicDocument(model: ClassicDocument, opts: { save?: boolean } = {}) {
  const { doc, autoTable } = await createPdf("portrait")
  const pdf = doc as unknown as JsPDFWithAutoTable
  const { w, h } = pageSize(doc)
  const right = w - M
  const cw = right - M
  const brand = model.brand
  const PANEL = tint(brand, 0.94)
  const DEEP: RGB = brand.map((v) => Math.round(v * 0.72)) as RGB

  // ── Title bar ─────────────────────────────────────────────────────
  doc.setFillColor(...brand)
  doc.roundedRect(M, 16, cw, 9.5, 1.6, 1.6, "F")
  setText(doc, 17, WHITE, "bold")
  doc.text(clean(model.title).toUpperCase(), w / 2, 23.1, { align: "center" })

  // ── Logo (or initials + name) and references ──────────────────────
  let y = 33
  if (model.logo) {
    const ratio = model.logo.naturalWidth && model.logo.naturalHeight ? model.logo.naturalWidth / model.logo.naturalHeight : 3
    const lh = Math.min(16, 50 / ratio)
    try {
      doc.addImage(model.logo, model.logo.src.startsWith("data:image/jpeg") ? "JPEG" : "PNG", M, y + 2, lh * ratio, lh)
    } catch {
      logoTile(doc, null, model.companyName, M, y + 2, 14, model.brand)
    }
  } else {
    logoTile(doc, null, model.companyName, M, y + 2, 14, model.brand)
    setText(doc, 15, model.brand, "bold")
    doc.text(clean(model.companyName).toUpperCase(), M + 17, y + 11.5, { maxWidth: 70 })
  }

  const labelX = 128
  model.refs.forEach(([label, value], i) => {
    const ry = y + i * 5
    setText(doc, 7, INK, "bold")
    doc.text(`${clean(label)} :`, labelX, ry, { align: "right" })
    setText(doc, 7.2, BODY)
    fitText(doc, clean(value), labelX + 2, ry, right - labelX - 3, 7.2)
    doc.setDrawColor(...RULE)
    doc.setLineWidth(0.2)
    doc.line(labelX + 1.5, ry + 1.2, right, ry + 1.2)
  })
  if (model.status) {
    const { fg } = toneColors(model.status.tone)
    setText(doc, 7, fg, "bold")
    doc.text(clean(model.status.label).toUpperCase(), right, y + model.refs.length * 5 + 1.5, { align: "right" })
  }
  y = Math.max(y + 20, y + model.refs.length * 5 + 4)

  // ── From / To panels ──────────────────────────────────────────────
  const colW = (cw - 10) / 2
  const toX = M + colW + 10
  bar(doc, brand, M, y, colW, model.from.heading)
  bar(doc, brand, toX, y, colW, model.to.heading)
  y += 10
  const panel = (rows: [string, string][], x: number) => {
    let ry = y
    for (const [label, value] of rows) {
      setText(doc, 6.6, MUTED)
      doc.text(`${clean(label)} :`, x, ry)
      const bold = rows[0]?.[0] === label
      setText(doc, 7.2, INK, bold ? "bold" : "normal")
      const lines = doc.splitTextToSize(clean(value || "-"), colW - 33) as string[]
      doc.text(lines.slice(0, 3), x + 31, ry)
      ry += Math.max(1, Math.min(3, lines.length)) * 3.6 + 1.4
    }
    return ry
  }
  y = Math.max(panel(model.from.rows, M + 1), panel(model.to.rows, toX + 1)) + 4

  // ── Project description ───────────────────────────────────────────
  if (model.subject?.text) {
    bar(doc, brand, M, y, cw, model.subject.heading, "center")
    const lines = doc.splitTextToSize(clean(model.subject.text), cw - 4) as string[]
    const boxH = Math.max(12, lines.length * 3.8 + 7)
    doc.setFillColor(...PANEL)
    doc.rect(M, y + 6.4, cw, boxH, "F")
    setText(doc, 7.4, BODY)
    doc.text(lines, M + 2.2, y + 6.4 + boxH / 2 - ((lines.length - 1) * 3.8) / 2 + 1)
    y += 6.4 + boxH + 6
  }

  // ── Lines ─────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [[
      { content: clean(model.columns.description) },
      { content: clean(model.columns.unitPrice), styles: { halign: "center" } },
      { content: clean(model.columns.quantity), colSpan: 2, styles: { halign: "center" } },
      { content: clean(model.columns.total), styles: { halign: "center" } },
    ]],
    body: model.items.map((i) => [clean(i.description), clean(i.unitPrice), clean(i.quantity), clean(i.unit), clean(i.total)]),
    margin: { left: M, right: M, top: 18, bottom: 30 },
    theme: "grid",
    styles: { font: fontOf(doc), fontSize: 7, textColor: BODY, lineColor: RULE, lineWidth: 0.2, cellPadding: { top: 1.6, bottom: 1.6, left: 1.8, right: 1.8 }, minCellHeight: 5.4 },
    headStyles: { fillColor: tint(brand, 0.88), textColor: DEEP, fontStyle: "bold", fontSize: 7.2, lineColor: RULE },
    alternateRowStyles: { fillColor: tint(brand, 0.97) },
    columnStyles: {
      1: { cellWidth: 34, halign: "center" },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 34, halign: "center" },
    },
  })
  y = (pdf.lastAutoTable?.finalY ?? y) + 8

  // ── Notes (left) and totals (right) ───────────────────────────────
  const notesW = 82
  const totalsH = model.totals.length * 5.6 + 16
  if (y + Math.max(totalsH, 40) > h - 50) {
    doc.addPage()
    y = 20
  }
  setText(doc, 7.6, DEEP, "bold")
  doc.text(clean(model.notes.heading).toUpperCase(), M + notesW / 2, y, { align: "center" })
  const notesTop = y + 1.5
  doc.setFillColor(...PANEL)
  const noteLines: { label: string; text: string[] }[] = model.notes.rows
    .filter(([, text]) => text)
    .map(([label, text]) => ({ label: clean(label), text: doc.splitTextToSize(clean(text), notesW - 4) as string[] }))
  const notesH = Math.max(totalsH - 4, 4 + noteLines.reduce((n, r) => n + r.text.length * 3.4 + 0.8, 0))
  doc.rect(M, notesTop, notesW, notesH, "F")
  let ny = notesTop + 4
  for (const row of noteLines) {
    setText(doc, 6.8, INK, "bold")
    const lw = row.label ? doc.getTextWidth(`${row.label} `) : 0
    if (row.label) doc.text(`${row.label} `, M + 1.6, ny)
    setText(doc, 6.8, BODY)
    // First line continues after the bold label, following lines start at the edge
    const first = doc.splitTextToSize(row.text.join(" "), notesW - 4 - lw) as string[]
    doc.text(first[0] ?? "", M + 1.6 + lw, ny)
    const rest = first.slice(1).join(" ")
    if (rest) {
      const more = doc.splitTextToSize(rest, notesW - 4) as string[]
      more.forEach((line, i) => doc.text(line, M + 1.6, ny + 3.4 * (i + 1)))
      ny += 3.4 * more.length
    }
    ny += 4.2
  }

  const valueW = 38
  const valueX = right - valueW
  model.totals.forEach((row, i) => {
    const ry = y + 1 + i * 5.6
    setText(doc, 6.6, row.strong ? INK : MUTED, row.strong ? "bold" : "normal")
    doc.text(clean(row.label).toUpperCase(), valueX - 4, ry, { align: "right" })
    setText(doc, 7.2, INK, row.strong ? "bold" : "normal")
    doc.text(clean(row.value), valueX + valueW / 2, ry, { align: "center" })
    doc.setDrawColor(...tint(brand, 0.55))
    doc.setLineWidth(0.25)
    doc.line(valueX, ry + 1.6, right, ry + 1.6)
  })
  const netY = Math.max(y + model.totals.length * 5.6 + 8, notesTop + notesH - 3)
  setText(doc, 10, DEEP, "bold")
  doc.text(clean(model.net.label).toUpperCase(), valueX - 6, netY, { align: "right" })
  doc.setFillColor(...brand)
  doc.roundedRect(valueX, netY - 4.4, valueW, 6.6, 1.2, 1.2, "F")
  setText(doc, 8.6, WHITE, "bold")
  fitText(doc, clean(model.net.value), valueX + valueW / 2, netY, valueW - 2, 8.6, { align: "center" })
  y = Math.max(netY + 8, notesTop + notesH + 6)

  // ── Signature ─────────────────────────────────────────────────────
  if (model.signature) {
    if (y + 22 > h - 34) {
      doc.addPage()
      y = 20
    }
    setText(doc, 7.6, INK, "bold")
    doc.text(clean(model.signature.label).toUpperCase(), M + 36, y + 3, { align: "right" })
    doc.setFillColor(...PANEL)
    doc.rect(M + 39, y - 0.5, 88, 16, "F")
    setText(doc, 6.4, MUTED)
    doc.setFont(fontOf(doc), "italic")
    doc.text(clean(model.signature.hint), M + 40.5, y + 3, { maxWidth: 85 })
    y += 22
  }

  // ── Footer on every page: legal line, terms, page number ──────────
  onLaterPages(doc, () => {
    doc.setFillColor(...brand)
    doc.rect(M, 8, cw, 1.2, "F")
    setText(doc, 7.5, MUTED, "bold")
    doc.text(clean(`${model.title} ${model.refs.find(([, v]) => v)?.[1] ?? ""}`), M, 14)
  })
  const total = doc.getNumberOfPages()
  for (let p = 1; p <= total; p++) {
    doc.setPage(p)
    setText(doc, 6.3, BODY)
    doc.setFont(fontOf(doc), "italic")
    doc.text(clean(model.legal), w / 2, h - 27, { align: "center", maxWidth: cw })
    if (model.terms) {
      setText(doc, 5.6, BODY)
      doc.setFont(fontOf(doc), "italic")
      const lines = doc.splitTextToSize(clean(model.terms), cw - 6) as string[]
      doc.text(lines.slice(0, 3), w / 2, h - 22, { align: "center" })
    }
    doc.setFillColor(...PANEL)
    doc.roundedRect(M, h - 14, cw, 7, 1.2, 1.2, "F")
    setText(doc, 6.6, MUTED, "bold")
    doc.text(clean(model.pageLabel(p, total)), right - 2, h - 9.6, { align: "right" })
    setText(doc, 6.6, MUTED)
    doc.text(clean(model.companyName), M + 2, h - 9.6)
  }
  if (model.stamp) watermark(doc, model.stamp.text, toneColors(model.stamp.tone).fg)
  if (opts.save !== false) doc.save(model.filename)
  return doc
}

import type { jsPDF } from "jspdf"
import type { CellHookData } from "jspdf-autotable"
import type { JsPDFWithAutoTable } from "@/types/pdf"
import { INK, LINE, MUTED, SOFT, WHITE, chips, clean, createPdf, drawFooters, logoTile, onLaterPages, pageSize, setText, tiles, tint, type RGB, type Tile } from "./pdf-kit"

/** Header band shared by every report: brand colour, logo, title, company and date. Returns the y below it. */
export function reportHeader(
  doc: jsPDF,
  opts: { brand: RGB; logo: HTMLImageElement | null; title: string; description?: string; company: string; companyLine?: string; generatedOn: string }
) {
  const { w } = pageSize(doc)
  const m = 14
  const h = 31
  doc.setFillColor(...opts.brand)
  doc.rect(0, 0, w, h, "F")
  // A lighter diagonal band gives the header some depth
  doc.setFillColor(...tint(opts.brand, 0.12))
  doc.triangle(w * 0.62, 0, w, 0, w, h, "F")
  logoTile(doc, opts.logo, opts.company, m, 7.5, 16, opts.brand, true)
  setText(doc, 17, WHITE, "bold")
  doc.text(clean(opts.title), m + 21, 15)
  if (opts.description) {
    setText(doc, 8.3, tint(opts.brand, 0.78))
    doc.text(clean(opts.description), m + 21, 21, { maxWidth: w * 0.55 })
  }
  setText(doc, 10, WHITE, "bold")
  doc.text(clean(opts.company), w - m, 13, { align: "right" })
  setText(doc, 7.5, tint(opts.brand, 0.8))
  if (opts.companyLine) doc.text(clean(opts.companyLine), w - m, 18, { align: "right", maxWidth: w * 0.35 })
  doc.text(clean(opts.generatedOn), w - m, opts.companyLine ? 23 : 18.5, { align: "right" })
  return h + 9
}

/** Slim header for continuation pages. */
export function continuationHeader(doc: jsPDF, brand: RGB, title: string, company: string) {
  const { w } = pageSize(doc)
  doc.setFillColor(...brand)
  doc.rect(0, 0, w, 2, "F")
  setText(doc, 8, MUTED, "bold")
  doc.text(clean(title), 14, 10)
  doc.text(clean(company), w - 14, 10, { align: "right" })
}

export interface TableReport {
  brand: RGB
  logo: HTMLImageElement | null
  title: string
  description?: string
  company: string
  companyLine?: string
  generatedOn: string
  chips: [string, string][]
  tiles: Tile[]
  columns: { label: string; align: "left" | "right" }[]
  rows: string[][]
  totals?: string[]
  emptyText: string
  footer: { left: string; legal?: string; pageLabel: (page: number, total: number) => string }
  filename: string
}

/** Landscape report: header band, filter chips, summary tiles and a paginated table with totals. */
export async function renderTableReport(report: TableReport, opts: { save?: boolean } = {}) {
  const { doc, autoTable } = await createPdf("landscape")
  const pdf = doc as unknown as JsPDFWithAutoTable
  const { w } = pageSize(doc)
  const m = 14
  const brand = report.brand

  let y = reportHeader(doc, report)
  if (report.chips.length) y = chips(doc, report.chips, m, y, w - m * 2, brand) + 4
  if (report.tiles.length) y = tiles(doc, report.tiles, m, y, w - m * 2, brand, Math.min(5, Math.max(3, report.tiles.length)), 19) + 7

  autoTable(doc, {
    startY: y,
    head: [report.columns.map((c) => clean(c.label))],
    body: report.rows.length ? report.rows.map((r) => r.map(clean)) : [[{ content: clean(report.emptyText), colSpan: report.columns.length, styles: { halign: "center", textColor: MUTED } }]],
    foot: report.totals && report.rows.length ? [report.totals.map(clean)] : undefined,
    showFoot: "lastPage",
    margin: { left: m, right: m, top: 16, bottom: 22 },
    theme: "plain",
    styles: { fontSize: 7.6, textColor: INK, cellPadding: { top: 2.2, bottom: 2.2, left: 2.2, right: 2.2 }, lineColor: LINE, overflow: "linebreak" },
    headStyles: { fillColor: brand, textColor: WHITE, fontStyle: "bold", fontSize: 7.2 },
    bodyStyles: { lineWidth: { bottom: 0.15 } },
    alternateRowStyles: { fillColor: SOFT },
    footStyles: { fillColor: tint(brand, 0.88), textColor: INK, fontStyle: "bold" },
    columnStyles: Object.fromEntries(report.columns.map((c, i) => [i, { halign: c.align }])),
    didParseCell: (data: CellHookData) => {
      if (data.section !== "body") {
        const col = report.columns[data.column.index]
        if (col) data.cell.styles.halign = col.align
      }
    },
  })
  void pdf
  onLaterPages(doc, () => continuationHeader(doc, brand, report.title, report.company))
  drawFooters(doc, { left: report.footer.left, legal: report.footer.legal, pageLabel: report.footer.pageLabel, margin: m })
  if (opts.save !== false) doc.save(report.filename)
  return doc
}

import type { Analytics } from "@/lib/workforce/analytics"
import type { CompanySettings } from "@/types/work-settings"
import type { JsPDFWithAutoTable } from "@/types/pdf"
import { escapeHtml } from "@/lib/utils/sanitize"
import {
  BODY,
  INK,
  LINE,
  MUTED,
  SOFT,
  WHITE,
  barChart,
  chips,
  clean,
  companyLines,
  createPdf,
  drawFooters,
  ensureSpace,
  hBars,
  hexToRgb,
  legalLine,
  loadLogo,
  onLaterPages,
  pageSize,
  sectionTitle,
  setText,
  tiles,
  tint,
  toneColors,
  type RGB,
  type Tile,
} from "./pdf-kit"
import { continuationHeader, reportHeader } from "./report-template"
import { getPdfTranslator } from "./pdf-i18n"

/** Translation keys of every label the report prints; the toolbar and the PDF both use them. */
export const ANALYTICS_LABEL_KEYS = {
  revenue: "anRevenueEarned",
  margin: "anGrossMargin",
  utilization: "anUtilization",
  collected: "anCashCollected",
  profit: "anGrossProfit",
  laborCost: "anLaborCost",
  expenses: "expenses",
  billableHours: "anBillableHours",
  avgRate: "anAvgRate",
  openReceivables: "openReceivables",
  overdue: "overdue",
  revenueByPeriod: "anRevenueByPeriod",
  period: "anPeriod",
  hours: "hours",
  revenueByClient: "anRevenueByClient",
  client: "client",
  share: "anShare",
  change: "anChange",
  topProjects: "anTopProjects",
  project: "project",
  bridge: "anRevenueBridge",
  clientsAtRisk: "anClientsAtRisk",
  none: "anNothingToShow",
  vsPrevious: "pdfVsPrevious",
  current: "pdfCurrentPeriod",
  comparison: "pdfComparisonPeriod",
  revenueMix: "pdfRevenueMix",
  mixHourly: "pdfMixHourly",
  mixFixed: "pdfMixFixed",
  mixRetainer: "pdfMixRetainer",
  mixOther: "pdfMixOther",
  reason: "pdfReason",
  overdueReason: "pdfRiskOverdue",
  declineReason: "pdfRiskDecline",
  quietReason: "pdfRiskQuiet",
  keyFigures: "pdfKeyFigures",
} as const
export const BRIDGE_KEYS = { start: "anBridgeStart", growth: "anBridgeGrowth", new: "anBridgeNew", decline: "anBridgeDecline", lost: "anBridgeLost", end: "anBridgeEnd" } as const

export type AnalyticsLabels = Record<keyof typeof ANALYTICS_LABEL_KEYS, string> & { bridgeSteps: Record<keyof typeof BRIDGE_KEYS, string> }

export function analyticsLabels(t: (key: string) => string): AnalyticsLabels {
  const labels = Object.fromEntries(Object.entries(ANALYTICS_LABEL_KEYS).map(([k, key]) => [k, t(key)])) as Record<keyof typeof ANALYTICS_LABEL_KEYS, string>
  return { ...labels, bridgeSteps: Object.fromEntries(Object.entries(BRIDGE_KEYS).map(([k, key]) => [k, t(key)])) as AnalyticsLabels["bridgeSteps"] }
}

/** Everything the analytics report prints, with labels already translated. */
export interface AnalyticsReportInput {
  analytics: Analytics
  title: string
  /** Period, comparison and scope, already translated, e.g. ["Last 90 days", "vs previous period", "All clients"] */
  scope: string[]
  company: string
  generatedOn: string
  money: (n: number) => string
  bucketLabel: (isoDate: string) => string
  labels: AnalyticsLabels
  /** For the PDF, rebuilt in a language the PDF fonts can draw */
  pdf: { locale: string; currency: string; scopeKeys: [string, string]; scopeNames: [string | null, string | null]; company?: CompanySettings }
}

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n)}%`)
const signed = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`)
const change = (cur: number | null, prev: number | null) => (cur === null || prev === null || prev === 0 ? null : ((cur - prev) / Math.abs(prev)) * 100)

function kpiTiles(a: Analytics, l: AnalyticsLabels, money: (n: number) => string, num: (n: number) => string): Tile[] {
  const compare = a.showComparison && a.hasPrevious
  const tile = (label: string, value: string, cur: number | null, prev: number | null, points = false, invert = false): Tile => {
    if (!compare || cur === null || prev === null) return { label, value }
    const d = points ? cur - prev : change(cur, prev)
    if (d === null) return { label, value }
    const good = invert ? d < 0 : d > 0
    const text = points ? `${d > 0 ? "+" : ""}${d.toFixed(1)} pts` : signed(d)
    return { label, value, note: `${text} ${l.vsPrevious}`, noteTone: Math.abs(d) < 0.05 ? "neutral" : good ? "success" : "danger" }
  }
  return [
    tile(l.revenue, money(a.current.revenue), a.current.revenue, a.previous.revenue),
    tile(l.margin, pct(a.current.margin), a.current.margin, a.previous.margin, true),
    tile(l.utilization, pct(a.current.utilization), a.current.utilization, a.previous.utilization, true),
    tile(l.collected, money(a.current.collected), a.current.collected, a.previous.collected),
    tile(l.profit, money(a.current.profit), a.current.profit, a.previous.profit),
    tile(l.billableHours, `${num(Math.round(a.current.billableHours))} h`, a.current.billableHours, a.previous.billableHours),
    tile(l.avgRate, a.current.avgRate === null ? "—" : money(a.current.avgRate), a.current.avgRate, a.previous.avgRate),
    { label: l.overdue, value: money(a.receivables.overdue), note: `${l.openReceivables} ${money(a.receivables.open)}`, noteTone: a.receivables.overdue > 0 ? "warning" : "neutral" },
  ]
}

/** A print-ready HTML version of the report (also used for the on-screen preview). */
export function getAnalyticsReportHtml(input: AnalyticsReportInput): string {
  const { analytics: a, labels: l, money } = input
  const e = escapeHtml
  const brand = input.pdf.company?.brandColor || "#2563eb"
  const max = Math.max(1, ...a.series.map((s) => Math.max(s.revenue, s.previous?.revenue ?? 0)))
  const barW = 100 / Math.max(1, a.series.length)
  const bars = a.series
    .map((s, i) => {
      const h = (s.revenue / max) * 100
      const ph = ((s.previous?.revenue ?? 0) / max) * 100
      const x = i * barW + barW * 0.18
      return `${ph > 0 ? `<rect x="${x.toFixed(2)}%" y="${(100 - ph).toFixed(2)}%" width="${(barW * 0.4).toFixed(2)}%" height="${ph.toFixed(2)}%" rx="1" fill="${brand}" opacity=".25"/>` : ""}<rect x="${(x + barW * 0.24).toFixed(2)}%" y="${(100 - h).toFixed(2)}%" width="${(barW * 0.4).toFixed(2)}%" height="${h.toFixed(2)}%" rx="1" fill="${brand}"><title>${e(input.bucketLabel(s.from))}: ${e(money(s.revenue))}</title></rect>`
    })
    .join("")
  const rows = (cells: string[][]) => cells.map((r) => `<tr>${r.map((c, i) => `<td${i > 0 ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")
  const tilesHtml = kpiTiles(a, l, money, (n) => n.toLocaleString())
    .map((tile) => `<div class="kpi"><span>${e(tile.label)}</span><b>${e(tile.value)}</b>${tile.note ? `<em class="${tile.noteTone ?? ""}">${e(tile.note)}</em>` : ""}</div>`)
    .join("")

  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(input.title)}</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;margin:0;background:#fff;font-size:12px}
header{background:${brand};color:#fff;padding:22px 32px;display:flex;justify-content:space-between;gap:16px}
header h1{font-size:21px;margin:0}header p{margin:4px 0 0;opacity:.8}header .co{text-align:end}header .co b{display:block;font-size:13px}
main{padding:20px 32px 32px}.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:#eef2ff;border-radius:999px;padding:4px 10px;font-weight:600;font-size:11px}
h2{font-size:13px;margin:26px 0 10px;padding-inline-start:9px;border-inline-start:3px solid ${brand}}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px}
.kpi{border:1px solid #e2e8f0;border-radius:12px;padding:12px;position:relative}.kpi:before{content:"";position:absolute;top:0;inset-inline-start:12px;width:26px;height:3px;background:${brand};border-radius:0 0 3px 3px}
.kpi span{display:block;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:600}.kpi b{display:block;font-size:18px;margin-top:6px}
.kpi em{display:block;font-style:normal;font-size:10.5px;margin-top:3px;color:#64748b}.kpi em.success{color:#15803d}.kpi em.danger{color:#b91c1c}.kpi em.warning{color:#b45309}
table{width:100%;border-collapse:collapse}td,th{padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:start}th{font-size:10.5px;color:#fff;background:${brand};font-weight:600}
tbody tr:nth-child(even){background:#f8fafc}.num{text-align:end;font-variant-numeric:tabular-nums}
svg{width:100%;height:160px;background:#f8fafc;border-radius:10px;padding:8px}.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}
@media print{header{-webkit-print-color-adjust:exact;print-color-adjust:exact}th,.kpi:before,svg{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<header><div><h1>${e(input.title)}</h1><p>${e(input.scope.join(" · "))}</p></div><div class="co"><b>${e(input.company)}</b>${e(input.generatedOn)}</div></header>
<main>
<div class="chips">${input.scope.map((s) => `<span class="chip">${e(s)}</span>`).join("")}</div>
<div class="grid">${tilesHtml}</div>
<h2>${e(l.revenueByPeriod)}</h2>
<svg viewBox="0 0 100 100" preserveAspectRatio="none">${bars}</svg>
<div class="two">
<div><h2>${e(l.revenueByClient)}</h2><table><thead><tr><th>${e(l.client)}</th><th class="num">${e(l.revenue)}</th><th class="num">${e(l.share)}</th><th class="num">${e(l.change)}</th></tr></thead><tbody>
${rows(a.clients.filter((c) => c.revenue > 0).map((c) => [e(c.name), e(money(c.revenue)), e(pct(c.share)), e(signed(c.change))])) || `<tr><td>${e(l.none)}</td></tr>`}
</tbody></table></div>
<div><h2>${e(l.bridge)}</h2><table><tbody>
${rows(a.bridge.map((b) => [e(l.bridgeSteps[b.key]), e(money((b.key === "decline" || b.key === "lost") && b.amount ? -b.amount : b.amount))]))}
</tbody></table></div>
</div>
<h2>${e(l.topProjects)}</h2><table><thead><tr><th>${e(l.project)}</th><th class="num">${e(l.hours)}</th><th class="num">${e(l.revenue)}</th><th class="num">${e(l.margin)}</th></tr></thead><tbody>
${rows(a.projects.slice(0, 8).map((p) => [`${e(p.code)} · ${e(p.name)}`, `${Math.round(p.hours)} h`, e(money(p.revenue)), e(pct(p.margin))])) || `<tr><td>${e(l.none)}</td></tr>`}
</tbody></table>
<h2>${e(l.clientsAtRisk)}</h2><table><tbody>
${rows(a.risks.map((r) => [e(r.name), r.reason === "overdue" ? e(money(r.value)) : e(signed(r.value))])) || `<tr><td>${e(l.none)}</td></tr>`}
</tbody></table>
</main></body></html>`
}

/** Waterfall of the revenue bridge: start, ups and downs, end. */
function bridgeChart(doc: Parameters<typeof barChart>[0], a: Analytics, l: AnalyticsLabels, x: number, y: number, w: number, h: number, brand: RGB, money: (n: number) => string) {
  const steps = a.bridge
  const values = steps.map((s) => ((s.key === "decline" || s.key === "lost") && s.amount ? -s.amount : s.amount))
  let running = 0
  const bars = steps.map((s, i) => {
    const v = values[i]!
    if (s.key === "start" || s.key === "end") {
      running = v
      return { from: 0, to: v, key: s.key }
    }
    const from = running
    running += v
    return { from, to: running, key: s.key }
  })
  const max = Math.max(1, ...bars.map((b) => Math.max(b.from, b.to)))
  const plotH = h - 12
  const step = w / Math.max(1, bars.length)
  const bw = step * 0.56
  doc.setDrawColor(...LINE)
  doc.setLineWidth(0.15)
  doc.line(x, y + plotH, x + w, y + plotH)
  bars.forEach((b, i) => {
    const top = y + plotH - (Math.max(b.from, b.to) / max) * plotH
    const bh = Math.max(0.6, (Math.abs(b.to - b.from) / max) * plotH)
    const color: RGB = b.key === "start" || b.key === "end" ? brand : b.to >= b.from ? toneColors("success").fg : toneColors("danger").fg
    doc.setFillColor(...(b.key === "start" ? tint(brand, 0.45) : color))
    const bx = x + i * step + (step - bw) / 2
    doc.roundedRect(bx, top, bw, bh, 0.6, 0.6, "F")
    setText(doc, 6, INK, "bold")
    doc.text(clean(money(values[i]!)), bx + bw / 2, top - 1.2, { align: "center" })
    setText(doc, 5.8, MUTED)
    doc.text(clean(l.bridgeSteps[b.key]), bx + bw / 2, y + plotH + 4, { align: "center", maxWidth: step - 1 })
  })
  return y + h
}

/** A4 PDF of the report: header band, KPI tiles with changes, charts, bridge, projects and risks. */
export async function downloadAnalyticsPdf(input: AnalyticsReportInput, filename = "analytics-report.pdf", opts: { save?: boolean } = {}) {
  const { analytics: a } = input
  const { t, locale } = await getPdfTranslator(input.pdf.locale)
  const l = analyticsLabels(t)
  const currency = input.pdf.currency
  const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n)
  const compact = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(n)
  const num = (n: number) => new Intl.NumberFormat(locale).format(n)
  const bucket = (iso: string) => new Intl.DateTimeFormat(locale, a.bucket === "month" ? { month: "short", year: "2-digit" } : { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`))
  const company = input.pdf.company
  const companyName = company?.tradeName || company?.legalName || input.company
  const brand = hexToRgb(company?.brandColor)

  const { doc, autoTable } = await createPdf("portrait")
  const pdf = doc as unknown as JsPDFWithAutoTable
  const { w } = pageSize(doc)
  const m = 14
  const cw = w - m * 2

  let y = reportHeader(doc, {
    brand,
    logo: await loadLogo(company?.logoDataUrl),
    title: t("anReportTitle"),
    description: `${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${a.windows.current.from}T00:00:00`))} - ${new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${a.windows.current.to}T00:00:00`))}`,
    company: companyName,
    companyLine: companyLines(company)[0],
    generatedOn: `${t("pdfGeneratedOn")} ${new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date())}`,
  })
  const [rangeKey, compareKey] = input.pdf.scopeKeys
  const [clientName, teamName] = input.pdf.scopeNames
  y = chips(
    doc,
    [
      [t("repPeriod"), t(rangeKey)],
      [t("pdfCompare"), t(compareKey)],
      [t("client"), clientName ?? t("allClients")],
      [t("department"), teamName ?? t("allTeams")],
    ],
    m,
    y,
    cw,
    brand
  ) + 5

  sectionTitle(doc, l.keyFigures, m, y, brand, cw)
  y = tiles(doc, kpiTiles(a, l, money, num), m, y + 4, cw, brand, 4, 22) + 10

  // Revenue over time
  sectionTitle(doc, l.revenueByPeriod, m, y, brand, cw)
  y = barChart(doc, {
    x: m,
    y: y + 9,
    w: cw,
    h: 50,
    values: a.series.map((s) => s.revenue),
    compare: a.showComparison && a.hasPrevious ? a.series.map((s) => s.previous?.revenue ?? 0) : undefined,
    labels: a.series.map((s) => bucket(s.from)),
    brand,
    format: compact,
    legend: [l.current, a.showComparison && a.hasPrevious ? l.comparison : ""],
  }) + 10

  // Clients and bridge side by side
  y = ensureSpace(doc, y, 70)
  const half = (cw - 8) / 2
  sectionTitle(doc, l.revenueByClient, m, y, brand, half)
  sectionTitle(doc, l.bridge, m + half + 8, y, brand, half)
  const clients = a.clients.filter((c) => c.revenue > 0).slice(0, 7)
  const leftEnd = clients.length
    ? hBars(doc, clients.map((c) => ({ label: c.name, value: c.revenue, display: `${compact(c.revenue)}  ${pct(c.share)}` })), m, y + 6, half, brand)
    : (setText(doc, 8, MUTED), doc.text(clean(l.none), m, y + 10), y + 14)
  const rightEnd = bridgeChart(doc, a, l, m + half + 8, y + 9, half, 50, brand, compact)
  y = Math.max(leftEnd, rightEnd) + 10

  // Revenue mix as one stacked bar
  const mixTotal = a.mix.hourly + a.mix.fixed + a.mix.retainer + a.mix.other
  if (mixTotal > 0) {
    y = ensureSpace(doc, y, 26)
    sectionTitle(doc, l.revenueMix, m, y, brand, cw)
    const parts: [string, number, RGB][] = [
      [l.mixHourly, a.mix.hourly, brand],
      [l.mixFixed, a.mix.fixed, tint(brand, 0.35)],
      [l.mixRetainer, a.mix.retainer, tint(brand, 0.6)],
      [l.mixOther, a.mix.other, [203, 213, 225]],
    ]
    let x = m
    parts.forEach(([, value, color]) => {
      const pw = (Math.max(0, value) / mixTotal) * cw
      if (pw <= 0) return
      doc.setFillColor(...color)
      doc.rect(x, y + 5, pw, 6, "F")
      x += pw
    })
    let lx = m
    parts.forEach(([label, value, color]) => {
      doc.setFillColor(...color)
      doc.roundedRect(lx, y + 15, 2.6, 2.6, 0.6, 0.6, "F")
      setText(doc, 7.2, BODY)
      const text = clean(`${label}  ${money(value)} (${Math.round((value / mixTotal) * 100)}%)`)
      doc.text(text, lx + 4, y + 17.2)
      lx += doc.getTextWidth(text) + 10
    })
    y += 26
  }

  const table = (title: string, head: string[], body: string[][], right: number[], colorCol?: (row: number) => RGB | undefined) => {
    y = ensureSpace(doc, y, 30)
    sectionTitle(doc, title, m, y, brand, cw)
    autoTable(doc, {
      startY: y + 4,
      head: [head.map(clean)],
      body: body.length ? body.map((r) => r.map(clean)) : [[{ content: clean(l.none), colSpan: head.length, styles: { textColor: MUTED } }]],
      margin: { left: m, right: m, top: 16, bottom: 22 },
      theme: "plain",
      styles: { fontSize: 8, textColor: INK, cellPadding: 2.2, lineColor: LINE },
      headStyles: { fillColor: brand, textColor: WHITE, fontStyle: "bold", fontSize: 7.4 },
      bodyStyles: { lineWidth: { bottom: 0.15 } },
      alternateRowStyles: { fillColor: SOFT },
      columnStyles: Object.fromEntries(right.map((c) => [c, { halign: "right" as const }])),
      didParseCell: (data) => {
        if (data.section === "head" && right.includes(data.column.index)) data.cell.styles.halign = "right"
        if (data.section === "body" && colorCol && data.column.index === head.length - 1) {
          const c = colorCol(data.row.index)
          if (c) data.cell.styles.textColor = c
        }
      },
    })
    y = (pdf.lastAutoTable?.finalY ?? y) + 10
  }

  const projects = a.projects.slice(0, 10)
  table(
    l.topProjects,
    [l.project, l.hours, l.revenue, l.margin],
    projects.map((p) => [`${p.code} · ${p.name}`, `${num(Math.round(p.hours))} h`, money(p.revenue), pct(p.margin)]),
    [1, 2, 3],
    (i) => {
      const mg = projects[i]?.margin
      return mg === null || mg === undefined ? undefined : mg < 0 ? toneColors("danger").fg : mg < 20 ? toneColors("warning").fg : toneColors("success").fg
    }
  )
  const reason = (r: Analytics["risks"][number]) => (r.reason === "overdue" ? l.overdueReason : r.reason === "decline" ? l.declineReason : l.quietReason)
  table(
    l.clientsAtRisk,
    [l.client, l.reason, l.change],
    a.risks.map((r) => [r.name, reason(r), r.reason === "overdue" ? money(r.value) : signed(r.value)]),
    [2],
    (i) => (a.risks[i]?.level === "high" ? toneColors("danger").fg : toneColors("warning").fg)
  )

  onLaterPages(doc, () => continuationHeader(doc, brand, t("anReportTitle"), companyName))
  drawFooters(doc, {
    left: t("pdfConfidential"),
    legal: legalLine(company, input.company),
    pageLabel: (page, total) => t("pdfPageOf", { page, total }),
    margin: m,
  })
  if (opts.save !== false) doc.save(filename)
  return doc
}

/** Prints the same PDF, so the printed report and the download are identical. */
export async function printAnalyticsReport(input: AnalyticsReportInput) {
  const doc = await downloadAnalyticsPdf(input, undefined, { save: false })
  const url = String(doc.output("bloburl"))
  const win = window.open(url, "_blank")
  if (win) win.addEventListener("load", () => setTimeout(() => win.print(), 300))
}

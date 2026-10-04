import type { JsPDFWithAutoTable } from "@/types/pdf"
import type { Analytics } from "@/lib/workforce/analytics"
import { escapeHtml } from "@/lib/utils/sanitize"

/** Everything the analytics report prints, with labels already translated. */
export interface AnalyticsReportInput {
  analytics: Analytics
  title: string
  /** Period, comparison and scope, e.g. "Last 90 days · vs previous period · All clients" */
  subtitle: string
  company: string
  generatedOn: string
  money: (n: number) => string
  bucketLabel: (isoDate: string) => string
  labels: {
    revenue: string
    margin: string
    utilization: string
    collected: string
    profit: string
    laborCost: string
    expenses: string
    billableHours: string
    avgRate: string
    openReceivables: string
    overdue: string
    revenueByPeriod: string
    period: string
    hours: string
    revenueByClient: string
    client: string
    share: string
    change: string
    topProjects: string
    project: string
    bridge: string
    bridgeSteps: Record<"start" | "growth" | "new" | "decline" | "lost" | "end", string>
    clientsAtRisk: string
    none: string
  }
}

const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n)}%`)
const signed = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n.toFixed(1)}%`)

function kpis(input: AnalyticsReportInput) {
  const { analytics: a, labels: l, money } = input
  return [
    [l.revenue, money(a.current.revenue)],
    [l.margin, pct(a.current.margin)],
    [l.utilization, pct(a.current.utilization)],
    [l.collected, money(a.current.collected)],
    [l.profit, money(a.current.profit)],
    [l.billableHours, `${Math.round(a.current.billableHours).toLocaleString()} h`],
    [l.avgRate, a.current.avgRate === null ? "—" : money(a.current.avgRate)],
    [l.overdue, money(a.receivables.overdue)],
  ] as const
}

/** A print-ready HTML version of the report (also used for the on-screen preview). */
export function getAnalyticsReportHtml(input: AnalyticsReportInput): string {
  const { analytics: a, labels: l, money } = input
  const e = escapeHtml
  const max = Math.max(1, ...a.series.map((s) => s.revenue))
  const barW = 100 / Math.max(1, a.series.length)
  const bars = a.series
    .map((s, i) => {
      const h = (s.revenue / max) * 100
      return `<rect x="${(i * barW + barW * 0.15).toFixed(2)}%" y="${(100 - h).toFixed(2)}%" width="${(barW * 0.7).toFixed(2)}%" height="${h.toFixed(2)}%" rx="2" fill="#2563eb"><title>${e(input.bucketLabel(s.from))}: ${e(money(s.revenue))}</title></rect>`
    })
    .join("")
  const rows = (cells: string[][]) => cells.map((r) => `<tr>${r.map((c, i) => `<td${i > 0 ? ' class="num"' : ""}>${c}</td>`).join("")}</tr>`).join("")

  return `<!doctype html><html><head><meta charset="utf-8"><title>${e(input.title)}</title>
<style>
*{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;margin:0;padding:32px;background:#fff;font-size:12px}
.bar{height:4px;background:#2563eb;margin:-32px -32px 24px}
h1{font-size:20px;margin:0}h2{font-size:13px;margin:24px 0 8px;color:#0f172a}
.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:16px}
.kpi{border:1px solid #e2e8f0;border-radius:10px;padding:10px}.kpi b{display:block;font-size:16px;margin-top:4px}
table{width:100%;border-collapse:collapse}td,th{padding:6px 8px;border-bottom:1px solid #e2e8f0;text-align:start}th{font-size:11px;color:#64748b;font-weight:600}
.num{text-align:end;font-variant-numeric:tabular-nums}svg{width:100%;height:140px;background:#f8fafc;border-radius:8px}
.two{display:grid;grid-template-columns:1fr 1fr;gap:24px}@media print{body{padding:16px}.bar{margin:-16px -16px 16px}}
</style></head><body>
<div class="bar"></div>
<h1>${e(input.title)}</h1>
<div class="muted">${e(input.company)} · ${e(input.subtitle)} · ${e(input.generatedOn)}</div>
<div class="grid">${kpis(input).map(([k, v]) => `<div class="kpi"><span class="muted">${e(k)}</span><b>${e(v)}</b></div>`).join("")}</div>
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
</body></html>`
}

export function printAnalyticsReport(input: AnalyticsReportInput): void {
  const printWindow = window.open("", "_blank")
  if (!printWindow) return
  printWindow.document.open()
  printWindow.document.write(getAnalyticsReportHtml(input))
  printWindow.document.close()
  printWindow.onload = () => {
    printWindow.focus()
    setTimeout(() => printWindow.print(), 250)
  }
}

/** A4 PDF of the same report: KPI tiles, revenue bars and the client, project and risk tables. */
export async function downloadAnalyticsPdf(input: AnalyticsReportInput, filename = "analytics-report.pdf") {
  const { analytics: a, labels: l, money } = input
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as unknown as JsPDFWithAutoTable
  const width = doc.internal.pageSize.getWidth()
  const margin = 14
  const blue: [number, number, number] = [37, 99, 235]
  const muted: [number, number, number] = [100, 116, 139]
  // jsPDF's built-in fonts only cover Latin-1; narrow no-break spaces from Intl would print as gibberish
  const clean = (s: string) => s.replace(/[  ]/g, " ").replace(/−/g, "-")

  doc.setFillColor(...blue)
  doc.rect(0, 0, width, 4, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(clean(input.title), margin, 18)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(...muted)
  doc.text(clean(`${input.company} · ${input.subtitle} · ${input.generatedOn}`), margin, 24)

  // KPI tiles, 4 per row
  const tiles = kpis(input)
  const tileW = (width - margin * 2 - 9) / 4
  tiles.forEach(([label, value], i) => {
    const x = margin + (i % 4) * (tileW + 3)
    const y = 30 + Math.floor(i / 4) * 19
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(x, y, tileW, 16, 2, 2, "S")
    doc.setFontSize(7.5)
    doc.setTextColor(...muted)
    doc.text(clean(label), x + 3, y + 5.5)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text(clean(value), x + 3, y + 12)
    doc.setFont("helvetica", "normal")
  })

  // Revenue per period as bars
  let y = 74
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(clean(l.revenueByPeriod), margin, y)
  doc.setFont("helvetica", "normal")
  const chartH = 34
  const chartW = width - margin * 2
  y += 3
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(margin, y, chartW, chartH + 6, 2, 2, "F")
  const max = Math.max(1, ...a.series.map((s) => s.revenue))
  const step = chartW / Math.max(1, a.series.length)
  const labelEvery = Math.max(1, Math.ceil(a.series.length / 8))
  a.series.forEach((s, i) => {
    const h = (s.revenue / max) * chartH
    doc.setFillColor(...blue)
    doc.rect(margin + i * step + step * 0.15, y + chartH - h + 1, step * 0.7, h, "F")
    if (i % labelEvery === 0) {
      doc.setFontSize(6.5)
      doc.setTextColor(...muted)
      doc.text(clean(input.bucketLabel(s.from)), margin + i * step + step / 2, y + chartH + 5, { align: "center" })
    }
  })
  y += chartH + 12

  const table = (title: string, head: string[], body: string[][]) => {
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text(clean(title), margin, y)
    autoTable(doc, {
      startY: y + 2,
      head: [head.map(clean)],
      body: body.length ? body.map((r) => r.map(clean)) : [[l.none]],
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.8 },
      headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: "bold" },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" } },
    })
    y = (doc.lastAutoTable?.finalY ?? y) + 9
  }

  table(
    l.revenueByClient,
    [l.client, l.revenue, l.share, l.change],
    a.clients.filter((c) => c.revenue > 0).map((c) => [c.name, money(c.revenue), pct(c.share), signed(c.change)])
  )
  table(l.bridge, [l.bridge, l.revenue], a.bridge.map((b) => [l.bridgeSteps[b.key], money((b.key === "decline" || b.key === "lost") && b.amount ? -b.amount : b.amount)]))
  table(
    l.topProjects,
    [l.project, l.hours, l.revenue, l.margin],
    a.projects.slice(0, 8).map((p) => [`${p.code} · ${p.name}`, `${Math.round(p.hours)} h`, money(p.revenue), pct(p.margin)])
  )
  table(l.clientsAtRisk, [l.client, l.overdue], a.risks.map((r) => [r.name, r.reason === "overdue" ? money(r.value) : signed(r.value)]))

  doc.save(filename)
}

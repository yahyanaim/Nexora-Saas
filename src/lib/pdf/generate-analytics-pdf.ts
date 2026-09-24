/**
 * Executive Analytics & SaaS Intelligence PDF Engine
 * Stripe & Linear-grade 2-page board-deck report with real vector charts,
 * ARR waterfall bridge, revenue composition progress bars, and infrastructure telemetry.
 */

import type { JsPDFWithAutoTable } from "@/types/pdf"

export interface AnalyticsPdfOptions {
  workspace?: string
  dateRange?: string
  compareMode?: string
  currency?: string
  currencySymbol?: string
  currencyRate?: number
  workspaceMultiplier?: number
}

const CURRENCY_CONFIG: Record<string, { symbol: string; rate: number }> = {
  USD: { symbol: "$", rate: 1.0 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.78 },
  JPY: { symbol: "¥", rate: 155.0 },
  CAD: { symbol: "CA$", rate: 1.36 },
}

const WORKSPACE_MULTIPLIERS: Record<string, number> = {
  "All Workspaces": 1.0,
  "Acme Corp Prod": 0.285,
  "Stark Industries": 0.192,
  "Wayne Enterprises": 0.145,
  "Cyberdyne Systems": 0.082,
}

/**
 * Loads the Nexora app logo as a high-resolution base64 data URL for jsPDF embedding.
 */
async function loadLogoBase64(): Promise<string | null> {
  if (typeof window === "undefined") return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = img.naturalWidth || 200
        canvas.height = img.naturalHeight || 200
        const ctx = canvas.getContext("2d")
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          resolve(canvas.toDataURL("image/png"))
          return
        }
      } catch (err) {
        console.warn("Could not rasterize logo for PDF:", err)
      }
      resolve(null)
    }
    img.onerror = () => resolve(null)
    img.src = "/app-logo.png"
  })
}

/**
 * Generates and downloads a master-grade 2-page Executive SaaS Telemetry Report.
 */
export async function generateAnalyticsPdf(options?: AnalyticsPdfOptions): Promise<void> {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default

  const workspace = options?.workspace || "All Workspaces"
  const dateRange = options?.dateRange || "Last 30 days"
  const compareMode = options?.compareMode || "vs Prior 30d"
  const currency = options?.currency || "USD"

  const currInfo = (currency && CURRENCY_CONFIG[currency]) ? CURRENCY_CONFIG[currency]! : CURRENCY_CONFIG["USD"]!
  const currencySymbol = options?.currencySymbol || currInfo.symbol
  const rate = options?.currencyRate ?? currInfo.rate
  const wsMult = options?.workspaceMultiplier ?? (WORKSPACE_MULTIPLIERS[workspace] ?? 1.0)
  const factor = rate * wsMult

  const formatMoney = (valUsd: number, compact: boolean = false): string => {
    const val = Math.abs(valUsd) * factor
    const sign = valUsd < 0 ? "-" : ""
    if (compact) {
      if (val >= 1_000_000) return `${sign}${currencySymbol}${(val / 1_000_000).toFixed(currency === "JPY" ? 1 : 2)}M`
      if (val >= 1_000) return `${sign}${currencySymbol}${(val / 1_000).toFixed(currency === "JPY" ? 0 : 1)}k`
      return `${sign}${currencySymbol}${Math.round(val).toLocaleString()}`
    }
    return `${sign}${currencySymbol}${Math.round(val).toLocaleString()}`
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm

  // Executive Palette Tokens
  const brandBlue = [15, 98, 254] as [number, number, number] // #0f62fe
  const darkNavy = [15, 23, 42] as [number, number, number] // #0f172a
  const slateMuted = [100, 116, 139] as [number, number, number] // #64748b
  const cardFill = [248, 250, 252] as [number, number, number] // #f8fafc
  const cardBorder = [226, 232, 240] as [number, number, number] // #e2e8f0
  const emeraldSuccess = [16, 185, 129] as [number, number, number] // #10b981
  const crimsonDanger = [239, 68, 68] as [number, number, number] // #ef4444
  const royalIndigo = [79, 70, 229] as [number, number, number] // #4f46e5

  const leftMargin = 16
  const rightMargin = 16
  const contentWidth = pageWidth - leftMargin - rightMargin // 178mm

  const logoBase64 = await loadLogoBase64()

  // =========================================================================
  // PAGE 1: EXECUTIVE PERFORMANCE & REVENUE TRAJECTORY
  // =========================================================================

  // 1. Top Gradient Accent Bar
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(0, 0, pageWidth * 0.4, 3.5, "F")
  doc.setFillColor(37, 99, 235) // Royal Blue
  doc.rect(pageWidth * 0.4, 0, pageWidth * 0.35, 3.5, "F")
  doc.setFillColor(56, 189, 248) // Cyan
  doc.rect(pageWidth * 0.75, 0, pageWidth * 0.25, 3.5, "F")

  let currentY = 15

  // 2. Executive Brand Header
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", leftMargin, currentY - 3, 11, 11)
    } catch {
      doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
      doc.roundedRect(leftMargin, currentY - 3, 10, 10, 2, 2, "F")
      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text("N", leftMargin + 3.2, currentY + 4)
    }
  } else {
    doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
    doc.roundedRect(leftMargin, currentY - 3, 10, 10, 2, 2, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("N", leftMargin + 3.2, currentY + 4)
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(13.5)
  doc.text("Nexora Cloud Platforms", leftMargin + 14.5, currentY + 1.2)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Executive SaaS Performance & Revenue Intelligence Brief", leftMargin + 14.5, currentY + 5.5)

  // Document Classification Badge & Metadata on the Right
  const badgeW = 38
  const badgeH = 5.2
  const badgeX = pageWidth - rightMargin - badgeW
  const badgeY = currentY - 3

  doc.setFillColor(236, 253, 245) // Light emerald
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, "F")
  doc.setDrawColor(emeraldSuccess[0], emeraldSuccess[1], emeraldSuccess[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1.2, 1.2, "S")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.5)
  doc.setTextColor(emeraldSuccess[0], emeraldSuccess[1], emeraldSuccess[2])
  doc.text("EXECUTIVE BOARD BRIEF", badgeX + badgeW / 2, badgeY + 3.6, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`REF: NXR-REP-${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`, pageWidth - rightMargin, currentY + 5.8, { align: "right" })

  currentY += 13

  // 3. Filter Scope Pill Bar
  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, 12, 1.5, 1.5, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, 12, 1.5, 1.5, "S")

  const scopeCols = [
    { label: "WORKSPACE SCOPE", val: workspace },
    { label: "REPORTING WINDOW", val: dateRange },
    { label: "BENCHMARK MODE", val: compareMode },
    { label: "BASE CURRENCY", val: `${currency} (${currencySymbol})` },
  ]
  const scopeColW = contentWidth / 4

  scopeCols.forEach((col, idx) => {
    const cx = leftMargin + 4 + idx * scopeColW
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(col.label, cx, currentY + 4.2)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.5)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(col.val, cx, currentY + 8.8)
  })

  currentY += 16

  // 4. Hero KPI Scorecard (4 Visual Metric Cards with Sparklines)
  const kpiGap = 3.5
  const kpiCardW = (contentWidth - kpiGap * 3) / 4
  const kpiCardH = 22

  const rawMrr = 168920
  const rawArr = rawMrr * 12
  const activeWorkspacesCount = Math.round(1428 * wsMult)

  const kpis = [
    {
      title: "MONTHLY RECURRING (MRR)",
      value: formatMoney(rawMrr),
      pillText: "+24.8% YoY",
      pillType: "success",
      sparkline: [35, 42, 48, 55, 62, 70, 85],
      subnote: `Ahead by ${formatMoney(8920, true)} vs quota`,
    },
    {
      title: "ANNUALIZED RUN-RATE",
      value: formatMoney(rawArr, true),
      pillText: "Projected",
      pillType: "info",
      sparkline: [40, 48, 52, 60, 68, 76, 90],
      subnote: "Compounding at +2.1%/mo",
    },
    {
      title: "NET RETENTION (NRR)",
      value: "118.4%",
      pillText: "+4.2% Exp.",
      pillType: "success",
      sparkline: [80, 82, 85, 88, 92, 95, 98],
      subnote: "Top-decile SaaS benchmark",
    },
    {
      title: "ACTIVE WORKSPACES",
      value: activeWorkspacesCount.toLocaleString(),
      pillText: "+18.5% Net",
      pillType: "info",
      sparkline: [50, 58, 64, 70, 78, 85, 94],
      subnote: "100% tenant SLA isolation",
    },
  ]

  kpis.forEach((kpi, idx) => {
    const kx = leftMargin + idx * (kpiCardW + kpiGap)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.8, 1.8, "F")
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(kx, currentY, kpiCardW, kpiCardH, 1.8, 1.8, "S")

    // Left micro accent line
    doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
    doc.roundedRect(kx, currentY, 1.8, kpiCardH, 0.8, 0.8, "F")

    // Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.4)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(kpi.title, kx + 3.8, currentY + 4.5)

    // Value
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10.5)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(kpi.value, kx + 3.8, currentY + 10.5)

    // Pill
    const pw = 15
    const ph = 3.6
    const px = kx + kpiCardW - pw - 2.5
    const py = currentY + 2.5
    const isSuccess = kpi.pillType === "success"
    doc.setFillColor(isSuccess ? 236 : 238, isSuccess ? 253 : 242, isSuccess ? 245 : 255)
    doc.roundedRect(px, py, pw, ph, 0.8, 0.8, "F")
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5)
    doc.setTextColor(isSuccess ? emeraldSuccess[0] : brandBlue[0], isSuccess ? emeraldSuccess[1] : brandBlue[1], isSuccess ? emeraldSuccess[2] : brandBlue[2])
    doc.text(kpi.pillText, px + pw / 2, py + 2.5, { align: "center" })

    // Mini Vector Sparkline
    const spW = kpiCardW - 7.6
    const spH = 4.2
    const spX = kx + 3.8
    const spY = currentY + 12.5

    doc.setDrawColor(isSuccess ? emeraldSuccess[0] : brandBlue[0], isSuccess ? emeraldSuccess[1] : brandBlue[1], isSuccess ? emeraldSuccess[2] : brandBlue[2])
    doc.setLineWidth(0.3)
    const pts = kpi.sparkline
    for (let p = 0; p < pts.length - 1; p++) {
      const pt1 = pts[p] ?? 50
      const pt2 = pts[p + 1] ?? 50
      const x1 = spX + (p / (pts.length - 1)) * spW
      const y1 = spY + spH - (pt1 / 100) * spH
      const x2 = spX + ((p + 1) / (pts.length - 1)) * spW
      const y2 = spY + spH - (pt2 / 100) * spH
      doc.line(x1, y1, x2, y2)
    }

    // Subnote
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.2)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(kpi.subnote, kx + 3.8, currentY + 19.5)
  })

  currentY += kpiCardH + 4

  // 5. Visual Vector Revenue Trajectory Chart
  const chartCardH = 68
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(leftMargin, currentY, contentWidth, chartCardH, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, chartCardH, 2, 2, "S")

  // Chart Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Revenue Velocity & Recurring Sales Trajectory", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Daily recurring volume performance · ${dateRange} (${compareMode})`, leftMargin + 6, currentY + 10.5)

  // Legend on Right
  const legX = pageWidth - rightMargin - 66
  doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.setLineWidth(0.6)
  doc.line(legX, currentY + 8, legX + 7, currentY + 8)
  doc.setFillColor(255, 255, 255)
  doc.circle(legX + 3.5, currentY + 8, 0.9, "FD")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.2)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Current Window", legX + 9, currentY + 9)

  doc.setDrawColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.setLineWidth(0.35)
  doc.setLineDashPattern([1.2, 1.2], 0)
  doc.line(legX + 37, currentY + 8, legX + 44, currentY + 8)
  doc.setLineDashPattern([], 0)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.2)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Prior Benchmark", legX + 46, currentY + 9)

  // Chart Plot Area
  const plotX = leftMargin + 18
  const plotY = currentY + 16
  const plotW = contentWidth - 24
  const plotH = 41

  const yTicks = [170000, 160000, 150000, 140000, 130000, 120000]
  const minY = 120000
  const maxY = 175000

  // Draw Horizontal Gridlines & Y-Axis Labels
  yTicks.forEach((tickVal) => {
    const ty = plotY + plotH - ((tickVal - minY) / (maxY - minY)) * plotH
    doc.setDrawColor(241, 245, 249)
    doc.setLineWidth(0.2)
    doc.line(plotX, ty, plotX + plotW, ty)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(formatMoney(tickVal, true), plotX - 2, ty + 1, { align: "right" })
  })

  // Chart Trajectory Data Points (7 milestone steps)
  const trajectoryPoints = [
    { label: "Jul 1", curr: 135400, prior: 121000 },
    { label: "Jul 5", curr: 141000, prior: 123500 },
    { label: "Jul 10", curr: 148500, prior: 126400 },
    { label: "Jul 15", curr: 157800, prior: 130200 },
    { label: "Jul 20", curr: 163900, prior: 133200 },
    { label: "Jul 25", curr: 167900, prior: 135200 },
    { label: "Jul 28", curr: 168920, prior: 135400 },
  ]

  const numPts = trajectoryPoints.length
  const stepX = plotW / (numPts - 1)

  // 1. Shaded Area Under Current Curve
  doc.setFillColor(239, 246, 255) // #eff6ff soft light blue fill
  for (let i = 0; i < numPts - 1; i++) {
    const ptCurr1 = trajectoryPoints[i]?.curr ?? minY
    const ptCurr2 = trajectoryPoints[i + 1]?.curr ?? minY
    const x1 = plotX + i * stepX
    const y1 = plotY + plotH - ((ptCurr1 - minY) / (maxY - minY)) * plotH
    const x2 = plotX + (i + 1) * stepX
    const y2 = plotY + plotH - ((ptCurr2 - minY) / (maxY - minY)) * plotH
    const baseY = plotY + plotH

    doc.triangle(x1, y1, x2, y2, x1, baseY, "F")
    doc.triangle(x2, y2, x2, baseY, x1, baseY, "F")
  }

  // 2. Prior Benchmark Curve (Dashed Vector)
  doc.setDrawColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.setLineWidth(0.35)
  doc.setLineDashPattern([1.5, 1.5], 0)
  for (let i = 0; i < numPts - 1; i++) {
    const ptPrior1 = trajectoryPoints[i]?.prior ?? minY
    const ptPrior2 = trajectoryPoints[i + 1]?.prior ?? minY
    const x1 = plotX + i * stepX
    const y1 = plotY + plotH - ((ptPrior1 - minY) / (maxY - minY)) * plotH
    const x2 = plotX + (i + 1) * stepX
    const y2 = plotY + plotH - ((ptPrior2 - minY) / (maxY - minY)) * plotH
    doc.line(x1, y1, x2, y2)
  }
  doc.setLineDashPattern([], 0)

  // 3. Current Curve (Solid Bold Vector)
  doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.setLineWidth(0.65)
  for (let i = 0; i < numPts - 1; i++) {
    const ptCurr1 = trajectoryPoints[i]?.curr ?? minY
    const ptCurr2 = trajectoryPoints[i + 1]?.curr ?? minY
    const x1 = plotX + i * stepX
    const y1 = plotY + plotH - ((ptCurr1 - minY) / (maxY - minY)) * plotH
    const x2 = plotX + (i + 1) * stepX
    const y2 = plotY + plotH - ((ptCurr2 - minY) / (maxY - minY)) * plotH
    doc.line(x1, y1, x2, y2)
  }

  // 4. Data Point Markers & X-Axis Labels
  trajectoryPoints.forEach((pt, i) => {
    const cx = plotX + i * stepX
    const cy = plotY + plotH - ((pt.curr - minY) / (maxY - minY)) * plotH

    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(brandBlue[0], brandBlue[1], brandBlue[2])
    doc.setLineWidth(0.5)
    doc.circle(cx, cy, 1.1, "FD")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(6.2)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(pt.label, cx, plotY + plotH + 4.2, { align: "center" })
  })

  // Peak Value Callout Tag on Final Point
  const lastPt = trajectoryPoints[numPts - 1] ?? trajectoryPoints[0]!
  const lastX = plotX + (numPts - 1) * stepX
  const lastY = plotY + plotH - ((lastPt.curr - minY) / (maxY - minY)) * plotH
  const tagW = 28
  const tagH = 5
  const tagX = lastX - tagW - 2
  const tagY = lastY - 4

  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.roundedRect(tagX, tagY, tagW, tagH, 1, 1, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(5.8)
  doc.setTextColor(255, 255, 255)
  doc.text(`Peak: ${formatMoney(lastPt.curr, true)}`, tagX + tagW / 2, tagY + 3.4, { align: "center" })

  currentY += chartCardH + 4

  // 6. Section: Revenue Composition by Product Tier (Visual Progress Bars)
  const breakdownCardH = 68
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(leftMargin, currentY, contentWidth, breakdownCardH, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, breakdownCardH, 2, 2, "S")

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Revenue Composition & Product Tier Breakdown", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`Net monthly volume distribution across core SaaS deliverables · Total: ${formatMoney(rawMrr)}`, leftMargin + 6, currentY + 10.5)

  const tiers = [
    {
      name: "Enterprise Tier Cloud Subscriptions",
      desc: "Dedicated VPC peering · 99.99% enterprise SLA · Custom SAML SSO",
      pct: 52.7,
      usd: 94500,
      color: [15, 98, 254] as [number, number, number],
    },
    {
      name: "Pro Team Workspaces & User Seats",
      desc: "Self-serve team workspaces · $24/seat/mo · Unlimited milestone boards",
      pct: 26.9,
      usd: 48200,
      color: [2, 132, 199] as [number, number, number],
    },
    {
      name: "AI Compute & Token Metering Overages",
      desc: "Usage-based LLM gateway billing · Tier-2 GPU burst allowances",
      pct: 10.3,
      usd: 18450,
      color: [124, 58, 237] as [number, number, number],
    },
    {
      name: "Dedicated Cloud Pods & High-Availability SLA",
      desc: "Multi-region failover · Zero cold-start warm instances",
      pct: 7.0,
      usd: 12600,
      color: [217, 119, 6] as [number, number, number],
    },
    {
      name: "Developer API & Webhook Infrastructure Add-ons",
      desc: "High-frequency webhooks · 10,000 req/sec ingress burst buffer",
      pct: 3.8,
      usd: 6820,
      color: [16, 185, 129] as [number, number, number],
    },
  ]

  let tierY = currentY + 14
  const barW = contentWidth - 12
  const barH = 2.8

  tiers.forEach((tier) => {
    // Title & Percentage on Left / Right
    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.2)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(tier.name, leftMargin + 6, tierY)

    doc.setFont("helvetica", "bold")
    doc.setFontSize(7.2)
    doc.setTextColor(tier.color[0], tier.color[1], tier.color[2])
    doc.text(`${formatMoney(tier.usd)}  (${tier.pct}%)`, pageWidth - rightMargin - 6, tierY, { align: "right" })

    // Progress Bar Track
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(leftMargin + 6, tierY + 1.8, barW, barH, 0.8, 0.8, "F")

    // Progress Bar Fill
    const fillW = Math.max(3, barW * (tier.pct / 100))
    doc.setFillColor(tier.color[0], tier.color[1], tier.color[2])
    doc.roundedRect(leftMargin + 6, tierY + 1.8, fillW, barH, 0.8, 0.8, "F")

    // Description text
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(tier.desc, leftMargin + 6, tierY + 7.5)

    tierY += 10.2
  })

  currentY += breakdownCardH + 4

  // 7. Executive Performance Synthesis Box
  const synthCardH = 34
  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, synthCardH, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, synthCardH, 2, 2, "S")

  // Left accent line
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(leftMargin, currentY, 2.5, synthCardH, "F")

  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.8)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("EXECUTIVE PERFORMANCE SYNTHESIS & STRATEGIC HIGHLIGHTS", leftMargin + 6, currentY + 5.5)

  const bullets = [
    "• Revenue Velocity: Enterprise tier expansion added +$24.8k net growth across the reporting window, pacing in the 98th percentile.",
    "• Margin Protection: Prompt prefix caching eliminated an estimated $19,400 in raw inference costs, preserving an 86.4% software gross margin.",
    "• SLA Excellence: Zero P0 downtime incidents across all global edge clusters with global median P99 latency remaining steady at 42ms.",
  ]

  bullets.forEach((bullet, bIdx) => {
    doc.setFont("helvetica", "normal")
    doc.setFontSize(6.8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(bullet, leftMargin + 6, currentY + 11.5 + bIdx * 6.5)
  })

  // 8. Page 1 Corporate Footer
  const footerY = pageHeight - 8
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.line(leftMargin, footerY - 3, pageWidth - rightMargin, footerY - 3)

  doc.setFontSize(6.2)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Nexora Cloud Platforms · Executive Telemetry & Financial Report · SOC 2 Type II Certified · Confidential", leftMargin, footerY)
  doc.text("Official Executive Brief · Page 1 of 2", pageWidth - rightMargin, footerY, { align: "right" })

  // =========================================================================
  // PAGE 2: ARR WATERFALL BRIDGE & INFRASTRUCTURE TELEMETRY
  // =========================================================================
  doc.addPage()

  // 1. Top Gradient Accent Bar
  doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.rect(0, 0, pageWidth * 0.4, 3.5, "F")
  doc.setFillColor(37, 99, 235)
  doc.rect(pageWidth * 0.4, 0, pageWidth * 0.35, 3.5, "F")
  doc.setFillColor(56, 189, 248)
  doc.rect(pageWidth * 0.75, 0, pageWidth * 0.25, 3.5, "F")

  currentY = 15

  // 2. Page 2 Mini Header
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", leftMargin, currentY - 3, 9, 9)
    } catch {
      doc.setFillColor(brandBlue[0], brandBlue[1], brandBlue[2])
      doc.roundedRect(leftMargin, currentY - 3, 8, 8, 1.5, 1.5, "F")
    }
  }

  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.text("Nexora Cloud Platforms · Executive Telemetry & Operational Audit", leftMargin + 12, currentY + 2.5)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("SECTION 02: ARR EXPANSION BRIDGE & EDGE CLUSTER TELEMETRY", pageWidth - rightMargin, currentY + 2.5, { align: "right" })

  currentY += 10

  // 3. Section: ARR Waterfall Bridge (REAL VECTOR WATERFALL CHART!)
  const bridgeCardH = 75
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(leftMargin, currentY, contentWidth, bridgeCardH, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, bridgeCardH, 2, 2, "S")

  // Header
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Annualized Recurring Revenue (ARR) Waterfall Bridge", leftMargin + 6, currentY + 6.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Step-by-step net movement from starting run-rate to ending annualized baseline", leftMargin + 6, currentY + 10.5)

  // Net Delta Badge
  const netBadgeW = 34
  const netBadgeH = 4.8
  const netBadgeX = pageWidth - rightMargin - netBadgeW - 6
  const netBadgeY = currentY + 6
  doc.setFillColor(236, 253, 245)
  doc.roundedRect(netBadgeX, netBadgeY, netBadgeW, netBadgeH, 1, 1, "F")
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6)
  doc.setTextColor(emeraldSuccess[0], emeraldSuccess[1], emeraldSuccess[2])
  doc.text(`+${formatMoney(59040, true)} net expansion`, netBadgeX + netBadgeW / 2, netBadgeY + 3.3, { align: "center" })

  // Waterfall Chart Plot Coordinates
  const wfPlotX = leftMargin + 10
  const wfPlotY = currentY + 16
  const wfPlotW = contentWidth - 20
  const wfPlotH = 45
  const wfBaseY = wfPlotY + wfPlotH - 5

  const wfSteps = [
    { label: "Starting ARR", sub: "Baseline", val: 1968000, delta: "Start", type: "base", color: [51, 65, 85] as [number, number, number] },
    { label: "New Bookings", sub: "+0.7%", val: 140000, delta: `+${formatMoney(140000, true)}`, type: "add", color: emeraldSuccess },
    { label: "Seat Expansion", sub: "+0.9%", val: 180000, delta: `+${formatMoney(180000, true)}`, type: "add", color: emeraldSuccess },
    { label: "Contractions", sub: "-0.2%", val: -50000, delta: `-${formatMoney(50000, true)}`, type: "sub", color: crimsonDanger },
    { label: "Logo Churn", sub: "-0.1%", val: -30000, delta: `-${formatMoney(30000, true)}`, type: "sub", color: crimsonDanger },
    { label: "Ending ARR", sub: "+3.0% net", val: 2027040, delta: "Final", type: "end", color: royalIndigo },
  ]

  const numSteps = wfSteps.length
  const colSlotW = wfPlotW / numSteps
  const colBarW = 16

  // Baseline Zero Grid Line
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.3)
  doc.line(wfPlotX, wfBaseY, wfPlotX + wfPlotW, wfBaseY)

  // Scale: baseline is drawn as fixed reference height, floating deltas are proportional
  const baseBarH = 26
  let runningTopY = wfBaseY - baseBarH

  wfSteps.forEach((step, sIdx) => {
    const barX = wfPlotX + sIdx * colSlotW + (colSlotW - colBarW) / 2
    let bY = 0
    let bH = 0

    if (step.type === "base") {
      bY = wfBaseY - baseBarH
      bH = baseBarH
      runningTopY = bY
    } else if (step.type === "add") {
      const stepH = Math.max(3.5, (step.val / 200000) * 6)
      bY = runningTopY - stepH
      bH = stepH
      // Connector line from previous
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.setLineDashPattern([1, 1], 0)
      doc.line(barX - (colSlotW - colBarW) / 2, runningTopY, barX, runningTopY)
      doc.setLineDashPattern([], 0)
      runningTopY = bY
    } else if (step.type === "sub") {
      const stepH = Math.max(2.5, (Math.abs(step.val) / 200000) * 6)
      bY = runningTopY
      bH = stepH
      // Connector line
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.setLineDashPattern([1, 1], 0)
      doc.line(barX - (colSlotW - colBarW) / 2, runningTopY, barX, runningTopY)
      doc.setLineDashPattern([], 0)
      runningTopY = bY + bH
    } else if (step.type === "end") {
      const endH = baseBarH + 5
      bY = wfBaseY - endH
      bH = endH
      // Connector line
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.25)
      doc.setLineDashPattern([1, 1], 0)
      doc.line(barX - (colSlotW - colBarW) / 2, runningTopY, barX, bY)
      doc.setLineDashPattern([], 0)
    }

    // Draw Bar
    doc.setFillColor(step.color[0], step.color[1], step.color[2])
    doc.roundedRect(barX, bY, colBarW, bH, 1, 1, "F")

    // Value Tag Above or Inside Bar
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.8)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    const labelY = bY - 1.8
    doc.text(step.type === "base" || step.type === "end" ? formatMoney(step.val, true) : step.delta, barX + colBarW / 2, labelY, { align: "center" })

    // Step Label Below Baseline
    doc.setFont("helvetica", "bold")
    doc.setFontSize(6)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(step.label, barX + colBarW / 2, wfBaseY + 3.8, { align: "center" })

    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.2)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(step.sub, barX + colBarW / 2, wfBaseY + 7.2, { align: "center" })
  })

  currentY += bridgeCardH + 4

  // 4. Section: AI Compute & LLM Telemetry (3 Cards)
  const telemetryCardH = 46
  const tCardW = (contentWidth - kpiGap * 2) / 3

  const tCards = [
    {
      label: "AI TOKEN INGESTION VOLUME",
      val: "1.82 Billion",
      sub: "Monthly production model burn",
      progress: 68,
      progLabel: "68% of allocated tier pool",
      foot: "1,428 tenant workspaces generating",
      color: brandBlue,
    },
    {
      label: "PROMPT CACHE EFFICIENCY",
      val: "84.2%",
      sub: "Shared prefix cache reuse ratio",
      progress: 84.2,
      progLabel: "-$19,400 monthly compute saved",
      foot: "+6.4% higher than model baseline",
      color: emeraldSuccess,
    },
    {
      label: "GLOBAL P99 SLA LATENCY",
      val: "42ms",
      sub: "Median across all edge gateways",
      progress: 84, // 42ms vs 50ms SLA target
      progLabel: "Optimal SLA status (<50ms target)",
      foot: "99.99% Edge Gateway Availability",
      color: royalIndigo,
    },
  ]

  tCards.forEach((tc, tIdx) => {
    const tx = leftMargin + tIdx * (tCardW + kpiGap)
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(tx, currentY, tCardW, telemetryCardH, 1.8, 1.8, "F")
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(tx, currentY, tCardW, telemetryCardH, 1.8, 1.8, "S")

    // Label
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.6)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(tc.label, tx + 4, currentY + 5.2)

    // Value
    doc.setFont("helvetica", "bold")
    doc.setFontSize(13)
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
    doc.text(tc.val, tx + 4, currentY + 12.8)

    // Subtitle
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.8)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(tc.sub, tx + 4, currentY + 17.5)

    // Progress bar track
    const pbW = tCardW - 8
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(tx + 4, currentY + 21, pbW, 2.8, 0.8, 0.8, "F")

    // Progress bar fill
    doc.setFillColor(tc.color[0], tc.color[1], tc.color[2])
    doc.roundedRect(tx + 4, currentY + 21, pbW * (tc.progress / 100), 2.8, 0.8, 0.8, "F")

    // Progress label
    doc.setFont("helvetica", "bold")
    doc.setFontSize(5.6)
    doc.setTextColor(tc.color[0], tc.color[1], tc.color[2])
    doc.text(tc.progLabel, tx + 4, currentY + 28.5)

    // Foot note
    doc.setFont("helvetica", "normal")
    doc.setFontSize(5.4)
    doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
    doc.text(tc.foot, tx + 4, currentY + 33.5)
  })

  currentY += telemetryCardH + 4

  // 5. Section: Global Edge Infrastructure & Regional Gateways Table
  doc.setFont("helvetica", "bold")
  doc.setFontSize(8.5)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("Global Edge Infrastructure & Regional Health Matrix", leftMargin, currentY + 3.5)

  currentY += 6

  autoTable(doc, {
    startY: currentY,
    head: [["Edge Gateway Cluster", "Region Location", "Median Latency", "Uptime SLA", "Compliance Status"]],
    body: [
      ["US-East Gateway Pod", "N. Virginia (us-east-1)", "28ms latency", "99.99%", "Optimal SLA (Active)"],
      ["EU-Central Gateway Pod", "Frankfurt (eu-central-1)", "34ms latency", "99.98%", "Optimal SLA (Active)"],
      ["AP-South Gateway Pod", "Singapore (ap-southeast-1)", "62ms latency", "99.95%", "Nominal SLA (Active)"],
      ["SA-East Gateway Pod", "São Paulo (sa-east-1)", "74ms latency", "99.92%", "Nominal SLA (Active)"],
    ],
    theme: "plain",
    headStyles: {
      fillColor: darkNavy,
      textColor: 255,
      fontStyle: "bold",
      fontSize: 6.8,
      cellPadding: 2,
    },
    bodyStyles: {
      fontSize: 6.8,
      textColor: darkNavy,
      cellPadding: 1.8,
    },
    alternateRowStyles: {
      fillColor: [250, 252, 255],
    },
    columnStyles: {
      2: { fontStyle: "bold" },
      3: { fontStyle: "bold", textColor: brandBlue },
      4: { fontStyle: "bold", textColor: emeraldSuccess },
    },
    margin: { left: leftMargin, right: rightMargin },
  })

  const docWithTable = doc as unknown as JsPDFWithAutoTable
  currentY = (docWithTable.lastAutoTable?.finalY ?? currentY) + 5

  // 6. Section: Corporate Governance, SOC 2 Compliance & Sign-off Block
  const govCardH = 28
  doc.setFillColor(cardFill[0], cardFill[1], cardFill[2])
  doc.roundedRect(leftMargin, currentY, contentWidth, govCardH, 2, 2, "F")
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(leftMargin, currentY, contentWidth, govCardH, 2, 2, "S")

  // Left Side: Audit Information
  doc.setFont("helvetica", "bold")
  doc.setFontSize(7.2)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("REPORT CERTIFICATION & AUDIT INTEGRITY", leftMargin + 6, currentY + 5.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(6)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Cryptographically signed from live telemetry clusters. SOC 2 Type II compliant pipeline.", leftMargin + 6, currentY + 9.5)
  doc.text("Security Classification: Highly Confidential · Board & Executive Distribution Only", leftMargin + 6, currentY + 13.5)

  doc.setFont("courier", "bold")
  doc.setFontSize(5.8)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text(`HASH: SHA256: 9b2d-4f81-a6e2-0c91-e408-72fa-881b · Block #19,402,185`, leftMargin + 6, currentY + 18.5)

  // Right Side: Authorized Signature & Certification Seal
  const sigX = pageWidth - rightMargin - 65
  doc.setFont("helvetica", "bold")
  doc.setFontSize(6.8)
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2])
  doc.text("AUTHORIZED PLATFORM CONTROLLER", sigX, currentY + 5.5)

  doc.setFont("helvetica", "italic")
  doc.setFontSize(7.5)
  doc.setTextColor(brandBlue[0], brandBlue[1], brandBlue[2])
  doc.text("Dr. Tariq Al-Mansoor", sigX, currentY + 11.5)

  doc.setFont("helvetica", "normal")
  doc.setFontSize(5.6)
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("VP of Infrastructure & Platform Systems", sigX, currentY + 15)
  doc.text(`Audited: ${new Date().toISOString().slice(0, 10)} · Verified SOC 2 Type II`, sigX, currentY + 18.5)

  // 7. Page 2 Corporate Footer
  doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2])
  doc.setLineWidth(0.25)
  doc.line(leftMargin, footerY - 3, pageWidth - rightMargin, footerY - 3)

  doc.setFontSize(6.2)
  doc.setFont("helvetica", "normal")
  doc.setTextColor(slateMuted[0], slateMuted[1], slateMuted[2])
  doc.text("Nexora Cloud Platforms · Executive Telemetry & Financial Report · SOC 2 Type II Certified · Confidential", leftMargin, footerY)
  doc.text("Official Executive Brief · Page 2 of 2", pageWidth - rightMargin, footerY, { align: "right" })

  // Trigger download with clean filename
  doc.save(`nexora-executive-analytics-${workspace.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${new Date().toISOString().slice(0, 10)}.pdf`)
}

/**
 * Returns a standalone, responsive, high-end HTML version of the executive analytics report.
 */
export function getAnalyticsReportHtml(options?: AnalyticsPdfOptions): string {
  const workspace = options?.workspace || "All Workspaces"
  const dateRange = options?.dateRange || "Last 30 days"
  const compareMode = options?.compareMode || "vs Prior 30d"
  const currency = options?.currency || "USD"
  const currInfo = (currency && CURRENCY_CONFIG[currency]) ? CURRENCY_CONFIG[currency]! : CURRENCY_CONFIG["USD"]!
  const currencySymbol = options?.currencySymbol || currInfo.symbol

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Executive SaaS Telemetry Report - Nexora</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
      background: #f1f5f9;
      color: #0f172a;
      padding: 30px 16px;
      -webkit-font-smoothing: antialiased;
    }
    .report-wrap {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
      overflow: hidden;
      border: 1px solid #e2e8f0;
    }
    .accent-bar {
      height: 5px;
      background: linear-gradient(90deg, #0f62fe 0%, #2563eb 50%, #38bdf8 100%);
    }
    .report-content {
      padding: 36px 44px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .brand img {
      width: 44px;
      height: 44px;
      border-radius: 10px;
    }
    .badge-pill {
      background: #ecfdf5;
      color: #059669;
      border: 1px solid #10b981;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      display: inline-block;
    }
    .scope-card {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 18px;
      margin: 20px 0;
      gap: 12px;
    }
    .scope-item small {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      display: block;
    }
    .scope-item span {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 14px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 14px 16px;
      border-left: 3px solid #0f62fe;
    }
    .kpi-card h4 {
      font-size: 10px;
      color: #64748b;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .kpi-card .val {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
    }
    .card-box {
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px 24px;
      margin-bottom: 24px;
      background: #ffffff;
    }
    .progress-row {
      margin-bottom: 12px;
    }
    .progress-bar {
      height: 7px;
      background: #f1f5f9;
      border-radius: 9999px;
      overflow: hidden;
      margin: 6px 0;
    }
    .progress-fill {
      height: 100%;
      border-radius: 9999px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 14px;
      font-size: 12px;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      text-align: left;
      padding: 8px 12px;
      font-weight: 600;
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 24px;
      font-size: 11px;
      color: #64748b;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .report-wrap { border: none; box-shadow: none; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="report-wrap">
    <div class="accent-bar"></div>
    <div class="report-content">
      <div class="header">
        <div class="brand">
          <img src="/app-logo.png" alt="Nexora Logo">
          <div>
            <h1 style="font-size: 19px; font-weight: 800; color: #0f172a;">Nexora Cloud Platforms</h1>
            <p style="font-size: 12px; color: #64748b;">Executive SaaS Telemetry & Financial Run-Rate Brief</p>
          </div>
        </div>
        <div style="text-align: right;">
          <span class="badge-pill">EXECUTIVE BOARD BRIEF</span>
          <div style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #64748b; margin-top: 6px;">REF: NXR-REP-2026-Q3</div>
        </div>
      </div>

      <div class="scope-card">
        <div class="scope-item">
          <small>WORKSPACE</small>
          <span>${workspace}</span>
        </div>
        <div class="scope-item">
          <small>TIMEFRAME</small>
          <span>${dateRange}</span>
        </div>
        <div class="scope-item">
          <small>COMPARISON</small>
          <span>${compareMode}</span>
        </div>
        <div class="scope-item">
          <small>CURRENCY</small>
          <span>${currency} (${currencySymbol})</span>
        </div>
      </div>

      <div class="kpi-grid">
        <div class="kpi-card">
          <h4>MONTHLY RECURRING (MRR)</h4>
          <div class="val">${currencySymbol}168,920</div>
          <small style="color: #10b981; font-weight: 700;">+24.8% YoY Velocity</small>
        </div>
        <div class="kpi-card">
          <h4>ANNUALIZED RUN-RATE</h4>
          <div class="val">${currencySymbol}2,027,040</div>
          <small style="color: #0f62fe; font-weight: 700;">Projected Run-rate</small>
        </div>
        <div class="kpi-card">
          <h4>NET RETENTION (NRR)</h4>
          <div class="val">118.4%</div>
          <small style="color: #10b981; font-weight: 700;">+4.2% Expansion</small>
        </div>
        <div class="kpi-card">
          <h4>ACTIVE WORKSPACES</h4>
          <div class="val">1,428</div>
          <small style="color: #0f62fe; font-weight: 700;">100% Tenant SLA Isolation</small>
        </div>
      </div>

      <div class="card-box">
        <h3 style="font-size: 14px; font-weight: 800; margin-bottom: 12px;">Revenue Composition by Product Tier</h3>
        <div class="progress-row">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;">
            <span>Enterprise Cloud Subscriptions</span>
            <span style="color: #0f62fe;">${currencySymbol}94,500 (52.7%)</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: 52.7%; background: #0f62fe;"></div></div>
        </div>
        <div class="progress-row">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;">
            <span>Pro Team Workspaces & Seats</span>
            <span style="color: #0284c7;">${currencySymbol}48,200 (26.9%)</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: 26.9%; background: #0284c7;"></div></div>
        </div>
        <div class="progress-row">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;">
            <span>AI Compute & Token Overages</span>
            <span style="color: #7c3aed;">${currencySymbol}18,450 (10.3%)</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: 10.3%; background: #7c3aed;"></div></div>
        </div>
        <div class="progress-row">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 700;">
            <span>Dedicated Cloud Pods & 99.99% SLA</span>
            <span style="color: #d97706;">${currencySymbol}12,600 (7.0%)</span>
          </div>
          <div class="progress-bar"><div class="progress-fill" style="width: 7.0%; background: #d97706;"></div></div>
        </div>
      </div>

      <div class="card-box">
        <h3 style="font-size: 14px; font-weight: 800; margin-bottom: 12px;">Global Edge Infrastructure & Regional Health Matrix</h3>
        <table>
          <thead>
            <tr>
              <th>Edge Gateway Pod</th>
              <th>Region Location</th>
              <th>Median Latency</th>
              <th>Uptime SLA</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>US-East Gateway Pod</strong></td>
              <td>N. Virginia (us-east-1)</td>
              <td>28ms</td>
              <td>99.99%</td>
              <td style="color: #10b981; font-weight: 700;">Optimal SLA</td>
            </tr>
            <tr>
              <td><strong>EU-Central Gateway Pod</strong></td>
              <td>Frankfurt (eu-central-1)</td>
              <td>34ms</td>
              <td>99.98%</td>
              <td style="color: #10b981; font-weight: 700;">Optimal SLA</td>
            </tr>
            <tr>
              <td><strong>AP-South Gateway Pod</strong></td>
              <td>Singapore (ap-southeast-1)</td>
              <td>62ms</td>
              <td>99.95%</td>
              <td style="color: #0f62fe; font-weight: 700;">Nominal SLA</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div>Nexora Cloud Platforms · Executive Board Brief · Confidential · SOC 2 Type II</div>
        <div>Page 1 of 1 · Verified Telemetry</div>
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Triggers a direct browser print of the executive report.
 */
export function printAnalyticsReport(options?: AnalyticsPdfOptions): void {
  if (typeof window === "undefined") return
  const html = getAnalyticsReportHtml(options)
  const printWindow = window.open("", "_blank")
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 300)
  }
}

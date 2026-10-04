"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { useTranslations } from "next-intl"
import { RANGE_SHORT, formatChange, useAnalyticsFilter } from "./analytics-filter-context"

interface BreakdownItem {
  label: string
  amount: string
  trend?: "up" | "down" | "none"
  points?: number[]
}

function MiniWaveSparkline({ trend, points }: { trend: "up" | "down" | "none"; points?: number[] }) {
  if (trend === "none") {
    return <span className="text-muted-foreground text-xs">-</span>
  }

  const isUp = trend === "up"
  const color = isUp ? "#10b981" : "#ef4444"
  const values = points && points.length > 1 ? points : isUp ? [4, 6, 3, 9, 6, 12] : [11, 8, 12, 5, 7, 2]
  const max = Math.max(...values)
  const min = Math.min(...values)
  const d = values
    .map((v, i) => {
      const x = 1 + (i / (values.length - 1)) * 26
      const y = 12 - (max === min ? 5 : ((v - min) / (max - min)) * 10)
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")

  return (
    <svg width="28" height="14" viewBox="0 0 28 14" fill="none" className="shrink-0">
      <path d={d} stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Fixed order so a client keeps its colour as filters change the list */
const SEGMENT_COLORS = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

export function SalesBreakdownCard() {
  const t = useTranslations()
  const { dateRange, formatCurrency, analytics } = useAnalyticsFilter()

  const { items, badgeText, totalAmount, explanation, segments, mixRows } = useMemo(() => {
    const { clients, credits, current, bridge } = analytics
    const shown = clients.filter((c) => c.revenue > 0).slice(0, 6)
    const others = clients.filter((c) => c.revenue > 0).slice(6).reduce((sum, c) => sum + c.revenue, 0)
    const rows: BreakdownItem[] = shown.map((c) => ({
      label: c.name,
      amount: formatCurrency(c.revenue),
      trend: c.previous === 0 && c.revenue > 0 ? "up" : c.change === null ? "none" : c.change >= 0 ? "up" : "down",
      points: c.trend,
    }))
    if (others > 0) rows.push({ label: t("anOtherClients"), amount: formatCurrency(others), trend: "none" })
    const lost = bridge.find((b) => b.key === "lost")?.amount ?? 0
    if (credits < 0) rows.push({ label: t("anCreditNotes"), amount: formatCurrency(credits), trend: "down" })
    if (lost > 0) rows.push({ label: t("anLostVsPrevious"), amount: formatCurrency(-lost), trend: "down" })
    const top = shown[0]
    const fastest = [...shown].filter((c) => c.change !== null && c.previous > 0).sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0]
    const total = Math.max(1, clients.reduce((sum, c) => sum + c.revenue, 0))
    const { mix } = analytics
    const mixTotal = Math.max(1, mix.hourly + mix.fixed + mix.retainer + mix.other)
    return {
      segments: shown.map((c, i) => ({ name: c.name, share: (c.revenue / total) * 100, color: SEGMENT_COLORS[i % SEGMENT_COLORS.length]! })),
      mixRows: [
        { label: t("anMixHourly"), value: mix.hourly },
        { label: t("anMixFixed"), value: mix.fixed },
        { label: t("anMixRetainer"), value: mix.retainer },
        { label: t("anMixOther"), value: mix.other },
      ]
        .filter((r) => r.value > 0)
        .map((r) => ({ ...r, amount: formatCurrency(r.value), share: Math.round((r.value / mixTotal) * 100) })),
      badgeText: t("anTotalFor", { period: RANGE_SHORT[dateRange] }),
      totalAmount: formatCurrency(current.revenue),
      items: rows,
      explanation: top
        ? t("anLedgerNote", {
            client: top.name,
            share: Math.round(top.share ?? 0),
            fastest: fastest?.name ?? top.name,
            change: formatChange(fastest?.change ?? top.change),
          })
        : t("anNoRevenueYet"),
    }
  }, [analytics, dateRange, formatCurrency, t])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anRevenueByClient")}</span>
          </div>
          <span className="tabular-nums text-xs font-semibold text-primary">
            {totalAmount} ({badgeText})
          </span>
        </div>

        {/* Share of revenue per client */}
        {segments.length > 0 && (
          <div className="mb-3 space-y-2">
            <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-muted/40">
              {segments.map((seg) => (
                <div key={seg.name} title={`${seg.name} · ${Math.round(seg.share)}%`} style={{ width: `${seg.share}%`, backgroundColor: seg.color }} className="h-full first:rounded-s-full last:rounded-e-full" />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {segments.map((seg) => (
                <span key={seg.name} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: seg.color }} />
                  <span className="text-foreground/90">{seg.name}</span>
                  <span className="tabular-nums">{Math.round(seg.share)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="divide-y divide-border/40 text-xs">
          {items.length === 0 && (
            <p className="py-6 text-center text-muted-foreground">{t("anNoRevenueYet")}</p>
          )}
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 transition-colors hover:bg-muted/20"
            >
              <span className="text-foreground/90 font-normal truncate pr-2">
                {item.label}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="tabular-nums font-medium text-foreground">
                  {item.amount}
                </span>
                <div className="w-7 flex justify-end">
                  <MiniWaveSparkline trend={item.trend ?? "none"} points={item.points} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How the revenue was billed */}
      {mixRows.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border/40 pt-3">
          <p className="text-xs font-medium text-foreground/80">{t("anRevenueMix")}</p>
          {mixRows.map((r) => (
            <div key={r.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground/90">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">
                  <span className="font-medium text-foreground">{r.amount}</span> · {r.share}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${r.share}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anLedgerAnalysis")} </span>
        {explanation}
      </div>
    </div>
  )
}

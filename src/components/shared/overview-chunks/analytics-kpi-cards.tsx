"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { KpiTile } from "@/components/shared/kpi-tile"
import { change, sparkline, UTILIZATION_TARGET } from "@/lib/workforce/analytics"
import { RANGE_SHORT, formatChange, useAnalyticsFilter } from "./analytics-filter-context"

interface KpiCardData {
  title: string
  value: string
  change: string
  isPositive: boolean
  sparkline: number[]
  description: string
  explanation: string
}

export function AnalyticsKpiCards() {
  const t = useTranslations()
  const { dateRange, compareMode, formatCurrency, analytics, isLoading } = useAnalyticsFilter()
  const { current, previous, series, clients, receivables } = analytics

  const kpiMetrics: KpiCardData[] = useMemo(() => {
    const revenueChange = change(current.revenue, previous.revenue)
    const marginChange = change(current.margin, previous.margin, "points")
    const utilChange = change(current.utilization, previous.utilization, "points")
    const cashChange = change(current.collected, previous.collected)
    const top = clients[0]
    const busiest = [...series].sort((a, b) => b.revenue - a.revenue)[0]
    const compared = compareMode !== "none" && analytics.hasPrevious
    const vs = (value: string) => (compared ? value : "—")
    return [
      {
        title: t("anRevenueEarned"),
        value: formatCurrency(current.revenue),
        change: vs(formatChange(revenueChange)),
        isPositive: (revenueChange ?? 0) >= 0,
        sparkline: sparkline(series.map((s) => s.revenue)),
        description: t("anRevenueEarnedDesc"),
        explanation: top
          ? t("anRevenueNote", { client: top.name, share: Math.round(top.share ?? 0), best: busiest ? formatCurrency(busiest.revenue) : "—" })
          : t("anNoRevenueYet"),
      },
      {
        title: t("anGrossMargin"),
        value: current.margin === null ? "—" : `${current.margin.toLocaleString(undefined, { maximumFractionDigits: 1 })}%`,
        change: vs(formatChange(marginChange, "pts")),
        isPositive: (marginChange ?? 0) >= 0,
        sparkline: sparkline(series.map((s) => Math.max(0, s.profit))),
        description: t("anGrossMarginDesc"),
        explanation: t("anMarginNote", {
          profit: formatCurrency(current.profit),
          labor: formatCurrency(current.laborCost),
          expenses: formatCurrency(current.expenses),
        }),
      },
      {
        title: t("anUtilization"),
        value: current.utilization === null ? "—" : `${Math.round(current.utilization)}%`,
        change: vs(formatChange(utilChange, "pts")),
        isPositive: (utilChange ?? 0) >= 0,
        sparkline: sparkline(series.map((s) => s.billableHours)),
        description: t("anUtilizationDesc", { target: UTILIZATION_TARGET }),
        explanation: t("anUtilizationNote", {
          billable: Math.round(current.billableHours).toLocaleString(),
          available: Math.round(current.availableHours).toLocaleString(),
          gap: Math.max(0, Math.round((current.availableHours * UTILIZATION_TARGET) / 100 - current.billableHours)).toLocaleString(),
        }),
      },
      {
        title: t("anCashCollected"),
        value: formatCurrency(current.collected),
        change: vs(formatChange(cashChange)),
        isPositive: (cashChange ?? 0) >= 0,
        sparkline: sparkline(series.map((s) => s.collected)),
        description: t("anCashCollectedDesc"),
        explanation: t("anCashNote", {
          open: formatCurrency(receivables.open),
          overdue: formatCurrency(receivables.overdue),
          count: receivables.clients,
        }),
      },
    ]
  }, [t, formatCurrency, compareMode, analytics.hasPrevious, current, previous, series, clients, receivables])

  const periodTag = RANGE_SHORT[dateRange]

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpiMetrics.map((kpi) => (
        <KpiTile
          key={kpi.title}
          isLoading={isLoading}
          title={kpi.title}
          value={kpi.value}
          period={periodTag}
          change={kpi.change}
          isPositive={kpi.isPositive}
          sparkline={kpi.sparkline}
          description={kpi.description}
          noteLabel={t("anOperationalNote")}
          note={kpi.explanation}
        />
      ))}
    </div>
  )
}

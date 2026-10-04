"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { change, sparkline, UTILIZATION_TARGET } from "@/lib/workforce/analytics"
import { RANGE_SHORT, formatChange, useAnalyticsFilter } from "./analytics-filter-context"

interface SparklineBarProps {
  heights: number[] // heights between 0 and 100
  className?: string
}

function MiniBarSparkline({ heights, className }: SparklineBarProps) {
  return (
    <div className={cn("flex items-end gap-1 h-8 shrink-0", className)}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(15, h)}%` }}
          className="w-1.5 rounded-full bg-muted-foreground/25 dark:bg-muted-foreground/35 transition-all hover:bg-primary"
        />
      ))}
    </div>
  )
}

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
        <div
          key={kpi.title}
          aria-busy={isLoading}
          className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all hover:shadow-xs"
        >
          <div>
            {/* Card Top: Title with info icon */}
            <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 truncate">
                <Information className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate font-medium">{kpi.title}</span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground/70 shrink-0">
                {periodTag}
              </span>
            </div>

            {/* Card Middle: Big value, percentage pill, and mini bar sparkline */}
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {kpi.value}
                </div>
                <div
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-semibold",
                    kpi.change === "—"
                      ? "bg-muted text-muted-foreground"
                      : kpi.isPositive
                      ? "bg-success-soft text-success-foreground"
                      : "bg-danger-soft text-danger-foreground"
                  )}
                >
                  {kpi.change}
                </div>
              </div>
              <MiniBarSparkline heights={kpi.sparkline} />
            </div>

            {/* Card Description */}
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
              {kpi.description}
            </p>
          </div>

          {/* Operational Explanation Paragraph */}
          <div className="mt-3 border-t border-border/40 pt-2 text-xs leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">{t("anOperationalNote")} </span>
            {kpi.explanation}
          </div>
        </div>
      ))}
    </div>
  )
}

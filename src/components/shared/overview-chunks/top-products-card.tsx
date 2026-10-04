"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Information } from "@/components/ui/carbon/icons"
import { BudgetType } from "@/types/work-projects"
import { RANGE_LABEL, useAnalyticsFilter } from "./analytics-filter-context"

interface ProductRow {
  name: string
  revenue: string
  units: string
  progressPct: number
  iconEmoji: string
  margin: number | null
}

const TYPE_ICON: Record<BudgetType, string> = {
  [BudgetType.HOURLY]: "⏱️",
  [BudgetType.FIXED]: "📦",
  [BudgetType.RETAINER]: "🔁",
  [BudgetType.NON_BILLABLE]: "🏠",
}

/** Projects ranked by revenue earned in the period, with their margin. */
export function TopProductsCard() {
  const t = useTranslations()
  const { dateRange, formatCurrency, analytics } = useAnalyticsFilter()

  const { products, note } = useMemo(() => {
    const ranked = analytics.projects.filter((p) => p.revenue > 0).slice(0, 4)
    const max = Math.max(1, ...ranked.map((p) => p.revenue))
    const rows: ProductRow[] = ranked.map((p) => ({
      name: p.name,
      revenue: formatCurrency(p.revenue),
      units: `${Math.round(p.hours).toLocaleString()} h`,
      progressPct: Math.round((p.revenue / max) * 100),
      iconEmoji: TYPE_ICON[p.budgetType] ?? "⏱️",
      margin: p.margin,
    }))
    const total = analytics.current.revenue
    const best = [...ranked].filter((p) => p.margin !== null).sort((a, b) => (b.margin ?? 0) - (a.margin ?? 0))[0]
    const worst = [...ranked].filter((p) => p.margin !== null).sort((a, b) => (a.margin ?? 0) - (b.margin ?? 0))[0]
    return {
      products: rows,
      note:
        ranked[0] && best && worst
          ? t("anProjectsNote", {
              project: ranked[0].name,
              share: total > 0 ? Math.round((ranked[0].revenue / total) * 100) : 0,
              best: best.name,
              bestMargin: Math.round(best.margin ?? 0),
              worst: worst.name,
              worstMargin: Math.round(worst.margin ?? 0),
            })
          : t("anNoRevenueYet"),
    }
  }, [analytics, formatCurrency, t])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anTopProjects")}</span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{t(RANGE_LABEL[dateRange])}</span>
        </div>

        {/* Project Rows */}
        <div className="space-y-4 pt-1">
          {products.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">{t("anNoRevenueYet")}</p>}
          {products.map((prod) => (
            <div key={prod.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span>{prod.iconEmoji}</span>
                  <span className="truncate font-medium text-foreground">{prod.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 tabular-nums">
                  <span className="text-muted-foreground text-xs">{prod.units}</span>
                  {prod.margin !== null && (
                    <span className={prod.margin >= 30 ? "text-xs text-success-foreground" : "text-xs text-warning-foreground"}>
                      {t("anMarginShort", { margin: Math.round(prod.margin) })}
                    </span>
                  )}
                  <span className="font-semibold text-foreground">{prod.revenue}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-primary/80 transition-all duration-300"
                  style={{ width: `${prod.progressPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anProjectPerformance")} </span>
        {note}
      </div>
    </div>
  )
}

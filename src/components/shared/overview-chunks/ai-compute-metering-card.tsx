"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Information } from "@/components/ui/carbon/icons"
import { Clock3, Gauge, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"
import { UTILIZATION_TARGET } from "@/lib/workforce/analytics"
import { RANGE_LABEL, useAnalyticsFilter } from "./analytics-filter-context"

/** Team capacity and where the hours went (keeps the original telemetry card's layout). */
export function AiComputeMeteringCard() {
  const t = useTranslations()
  const { dateRange, analytics } = useAnalyticsFilter()

  const { billable, billableUnit, utilization, utilizationNote, onTarget, nonBillable, nonBillableNote, rows, explanation } = useMemo(() => {
    const { current, previous, projects } = analytics
    const util = current.utilization
    const top = projects.filter((p) => p.hours > 0).slice(0, 3)
    const idle = Math.max(0, current.availableHours - current.hours)
    return {
      billable: `${Math.round(current.billableHours).toLocaleString()} h`,
      billableUnit: t("anOfLogged", { hours: Math.round(current.hours).toLocaleString() }),
      utilization: util === null ? "—" : `${Math.round(util)}%`,
      utilizationNote: t("anTargetIs", { target: UTILIZATION_TARGET }),
      onTarget: util !== null && util >= UTILIZATION_TARGET,
      nonBillable: current.nonBillableShare === null ? "—" : `${Math.round(current.nonBillableShare)}%`,
      nonBillableNote: t("anOfLoggedShort"),
      rows: top,
      explanation:
        current.hours === 0
          ? t("anNoHoursYet")
          : t("anCapacityNote", {
              idle: Math.round(idle).toLocaleString(),
              before: previous.utilization === null ? "—" : `${Math.round(previous.utilization)}%`,
              now: util === null ? "—" : `${Math.round(util)}%`,
            }),
    }
  }, [analytics, t])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anCapacityTitle")}</span>
            <span className="text-xs tabular-nums text-muted-foreground">({t(RANGE_LABEL[dateRange])})</span>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              onTarget ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"
            )}
          >
            <span className={cn("size-1.5 rounded-full animate-pulse", onTarget ? "bg-success" : "bg-warning")} />
            {onTarget ? t("anOnTarget") : t("anBelowTarget")}
          </span>
        </div>

        {/* Capacity metrics grid */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="size-3 text-primary" />
              <span>{t("anBillableHours")}</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">{billable}</p>
            <p className="text-xs text-muted-foreground">{billableUnit}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Gauge className="size-3 text-warning-foreground" />
              <span>{t("anUtilization")}</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">{utilization}</p>
            <p className={cn("text-xs", onTarget ? "text-success-foreground" : "text-warning-foreground")}>{utilizationNote}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coffee className="size-3 text-indigo-500" />
              <span>{t("anNonBillable")}</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">{nonBillable}</p>
            <p className="text-xs text-muted-foreground">{nonBillableNote}</p>
          </div>
        </div>

        {/* Where the hours went */}
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-foreground/80">{t("anHoursByProject")}</p>
          <div className="divide-y divide-border/40 text-xs">
            {rows.length === 0 && <p className="py-3 text-center text-muted-foreground">{t("anNoHoursYet")}</p>}
            {rows.map((r) => (
              <div key={r.projectId} className="flex items-center justify-between py-1.5">
                <span className="truncate pe-2 font-normal text-foreground/90">
                  <span className="font-mono text-muted-foreground">{r.code}</span> {r.name}
                </span>
                <div className="flex shrink-0 items-center gap-2 tabular-nums text-xs">
                  <span className="text-muted-foreground">{Math.round(r.hours).toLocaleString()} h</span>
                  <span
                    className={cn(
                      "rounded-xs px-1.5 py-0.5 text-xs font-semibold",
                      (r.billableShare ?? 0) >= 80 ? "bg-success-soft text-success-foreground" : "bg-warning-soft text-warning-foreground"
                    )}
                  >
                    {t("anBillableShare", { share: Math.round(r.billableShare ?? 0) })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anCapacitySummary")} </span>
        {explanation}
      </div>
    </div>
  )
}

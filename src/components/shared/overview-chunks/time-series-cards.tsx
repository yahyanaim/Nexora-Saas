"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { Information } from "@/components/ui/carbon/icons"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts"
import { UTILIZATION_TARGET, change } from "@/lib/workforce/analytics"
import { COMPARE_LABEL, RANGE_LABEL, formatChange, useAnalyticsFilter } from "./analytics-filter-context"

function ticksFor(labels: string[], count: number) {
  const every = Math.max(1, Math.ceil(labels.length / count))
  return labels.filter((_, i) => i % every === 0 || i === labels.length - 1)
}

/** Billable share of available hours per bucket, against the comparison period and the target. */
export function SessionOverTimeCard() {
  const t = useTranslations()
  const { dateRange, compareMode, formatBucket, analytics } = useAnalyticsFilter()
  const showComparison = analytics.showComparison && analytics.hasPrevious

  const { data, ticks, headline, deltaText, deltaPositive, explanation } = useMemo(() => {
    const { series, current, previous } = analytics
    const rows = series.map((s) => ({
      time: formatBucket(s.from),
      current: s.utilization === null ? null : Math.round(s.utilization),
      previous: s.previous?.utilization == null ? null : Math.round(s.previous.utilization),
    }))
    const valid = series.filter((s) => s.utilization !== null && s.availableHours > 0)
    const peak = [...valid].sort((a, b) => (b.utilization ?? 0) - (a.utilization ?? 0))[0]
    const low = [...valid].sort((a, b) => (a.utilization ?? 0) - (b.utilization ?? 0))[0]
    const delta = change(current.utilization, previous.utilization, "points")
    return {
      data: rows,
      ticks: ticksFor(rows.map((r) => r.time), dateRange === "7d" ? 7 : 4),
      headline: current.utilization === null ? "—" : `${Math.round(current.utilization)}%`,
      deltaText: formatChange(delta, "pts"),
      deltaPositive: (delta ?? 0) >= 0,
      explanation:
        peak && low
          ? t("anUtilTrendNote", {
              peak: formatBucket(peak.from),
              peakValue: Math.round(peak.utilization ?? 0),
              low: formatBucket(low.from),
              lowValue: Math.round(low.utilization ?? 0),
              target: UTILIZATION_TARGET,
            })
          : t("anNoHoursYet"),
    }
  }, [analytics, dateRange, formatBucket, t])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anUtilOverTime")}</span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{t(RANGE_LABEL[dateRange])}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{headline}</span>
          <span className="text-xs text-muted-foreground">{t("anOfAvailable")}</span>
          {showComparison && (
            <span className={`text-xs font-medium ${deltaPositive ? "text-success-foreground" : "text-danger-foreground"}`}>{deltaText}</span>
          )}
        </div>

        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" ticks={ticks} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} tickFormatter={(v) => `${v}%`} />
              <ReferenceLine y={UTILIZATION_TARGET} stroke="#10b981" strokeDasharray="4 4" strokeWidth={1} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <span className="font-medium text-foreground">{label}: </span>
                      <span className="tabular-nums text-primary font-medium">{payload[0]?.value ?? "—"}%</span>
                      {showComparison && payload[1]?.value != null && (
                        <span className="ms-2 tabular-nums text-muted-foreground">
                          {t(COMPARE_LABEL[compareMode])}: {payload[1].value}%
                        </span>
                      )}
                    </div>
                  )
                }}
              />
              <Line type="monotone" dataKey="current" stroke="#0284c7" strokeWidth={1.75} connectNulls dot={dateRange === "7d" ? { r: 2.5, fill: "#0284c7" } : false} />
              {showComparison && (
                <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={1.25} strokeDasharray="2 2" connectNulls dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 border-t border-border/40 pt-2.5 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anDeliveryTelemetry")} </span>
        {explanation}
      </div>
    </div>
  )
}

/** Average rate billed per hour on hourly work, per bucket. */
export function AverageOrderValueCard() {
  const t = useTranslations()
  const { dateRange, formatCurrency, formatBucket, analytics } = useAnalyticsFilter()

  const { data, ticks, latest, deltaText, deltaPositive, explanation } = useMemo(() => {
    const { series, current, previous } = analytics
    const rows = series.filter((s) => s.avgRate !== null).map((s) => ({ time: formatBucket(s.from), value: Math.round(s.avgRate ?? 0) }))
    const delta = change(current.avgRate, previous.avgRate)
    return {
      data: rows,
      ticks: ticksFor(rows.map((r) => r.time), 4),
      latest: current.avgRate,
      deltaText: formatChange(delta),
      deltaPositive: (delta ?? 0) >= 0,
      explanation:
        current.avgRate === null
          ? t("anNoHoursYet")
          : t("anRateNote", {
              rate: formatCurrency(current.avgRate),
              hours: Math.round(current.hourlyHours).toLocaleString(),
              cost: current.hours > 0 ? formatCurrency(current.laborCost / current.hours) : "—",
            }),
    }
  }, [analytics, formatBucket, formatCurrency, t])

  const values = data.map((d) => d.value)
  const minVal = values.length ? Math.min(...values) : 0
  const maxVal = values.length ? Math.max(...values) : 100
  const yDomainMin = Math.max(0, Math.floor((minVal * 0.9) / 10) * 10)
  const yDomainMax = Math.ceil((maxVal * 1.05) / 10) * 10

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anAvgRate")}</span>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">{t(RANGE_LABEL[dateRange])}</span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">{latest === null ? "—" : formatCurrency(latest)}</span>
          <span className="text-xs text-muted-foreground">{t("anPerHour")}</span>
          {analytics.showComparison && analytics.hasPrevious && (
            <span className={`text-xs font-medium ${deltaPositive ? "text-success-foreground" : "text-danger-foreground"}`}>{deltaText}</span>
          )}
        </div>

        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border/40" />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" ticks={ticks} />
              <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} className="fill-muted-foreground" domain={[yDomainMin, yDomainMax]} tickFormatter={(v) => formatCurrency(Number(v))} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <span className="font-medium text-foreground">{label}: </span>
                      <span className="tabular-nums text-primary font-medium">
                        {formatCurrency(Number(payload[0]?.value))} {t("anPerHour")}
                      </span>
                    </div>
                  )
                }}
              />
              <Line type="monotone" dataKey="value" stroke="#0284c7" strokeWidth={1.75} dot={{ r: 2.5, fill: "#0284c7" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 border-t border-border/40 pt-2.5 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anUnitEconomics")} </span>
        {explanation}
      </div>
    </div>
  )
}

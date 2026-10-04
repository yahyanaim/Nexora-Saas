"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { useTranslations } from "next-intl"
import { change, cumulative } from "@/lib/workforce/analytics"
import { COMPARE_LABEL, RANGE_LABEL, formatChange, useAnalyticsFilter } from "./analytics-filter-context"

export function TotalSalesChart() {
  const t = useTranslations()
  const { dateRange, compareMode, formatCurrency, formatBucket, analytics, clientId, clients: clientList } = useAnalyticsFilter()
  const { series, current, previous, clients } = analytics
  const showComparison = analytics.showComparison && analytics.hasPrevious

  const { chartData, xTicks, deltaText, deltaPositive, explanation } = useMemo(() => {
    const now = cumulative(series.map((s) => s.revenue))
    const before = cumulative(series.map((s) => s.previous?.revenue ?? 0))
    const data = series.map((s, i) => ({ date: formatBucket(s.from), current: now[i] ?? 0, previous: before[i] ?? 0 }))
    const every = Math.max(1, Math.ceil(data.length / 6))
    const ticks = data.filter((_, i) => i % every === 0 || i === data.length - 1).map((d) => d.date)
    const diff = current.revenue - previous.revenue
    const pctChange = change(current.revenue, previous.revenue)
    const best = [...series].sort((a, b) => b.revenue - a.revenue)[0]
    const top = clients[0]
    return {
      chartData: data,
      xTicks: ticks,
      deltaText: t("anVsComparison", {
        amount: formatCurrency(diff, { signed: true }),
        change: formatChange(pctChange),
        comparison: t(COMPARE_LABEL[compareMode === "none" ? "previous" : compareMode]),
      }),
      deltaPositive: diff >= 0,
      explanation:
        top && best
          ? t("anRevenueGuidance", {
              client: top.name,
              share: Math.round(top.share ?? 0),
              period: formatBucket(best.from),
              best: formatCurrency(best.revenue),
              rate: current.avgRate ? formatCurrency(current.avgRate) : "—",
            })
          : t("anNoRevenueYet"),
    }
  }, [series, current, previous, clients, compareMode, formatBucket, formatCurrency, t])

  const latestCurrent = chartData[chartData.length - 1]?.current ?? 0
  const days = Math.max(1, Math.round((new Date(`${analytics.windows.current.to}T00:00:00`).getTime() - new Date(`${analytics.windows.current.from}T00:00:00`).getTime()) / 86400000) + 1)
  const runRate = (latestCurrent / days) * 365

  // Compute dynamic domain based on data values
  const maxVal = Math.max(1, ...chartData.map((d) => (showComparison ? Math.max(d.current, d.previous) : d.current)))
  const yDomainMin = 0
  const yDomainMax = Math.ceil((maxVal * 1.08) / 1000) * 1000
  const scope = clientId ? (clientList.find((c) => c.id === clientId)?.name ?? "") : t("allClients")

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anRevenueGrowth")}</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
            {t(RANGE_LABEL[dateRange])}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
            {formatCurrency(latestCurrent)}
          </span>
          {showComparison && analytics.hasPrevious && (
            <span className={`text-xs font-medium ${deltaPositive ? "text-success-foreground" : "text-danger-foreground"}`}>
              {deltaText}
            </span>
          )}
          <span className="hidden sm:inline-block text-xs text-muted-foreground tabular-nums">
            ({t("anRunRate", { amount: formatCurrency(runRate, { compact: true }) })})
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div className="mt-4 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border/40"
            />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              ticks={xTicks}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              domain={[yDomainMin, yDomainMax]}
              tickFormatter={(v) => formatCurrency(Number(v), { compact: true })}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const curr = Number(payload[0]?.value)
                const prev = payload[1] ? Number(payload[1]?.value) : null
                const delta = prev !== null ? curr - prev : null
                return (
                  <div className="rounded-lg border border-border/80 bg-popover px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-foreground">{label}</p>
                    <div className="mt-1 space-y-1">
                      <p className="text-primary tabular-nums font-medium">
                        {t("anCurrent")}: {formatCurrency(curr)}
                      </p>
                      {prev !== null && (
                        <p className="text-muted-foreground tabular-nums text-xs">
                          {t(COMPARE_LABEL[compareMode])}: {formatCurrency(prev)}
                        </p>
                      )}
                      {delta !== null && (
                        <p className="text-success-foreground tabular-nums text-xs">
                          {t("anVariance")}: {formatCurrency(delta, { signed: true })}
                        </p>
                      )}
                    </div>
                  </div>
                )
              }}
            />
            {/* Solid primary line for current period */}
            <Line
              type="monotone"
              dataKey="current"
              stroke="#0284c7"
              strokeWidth={2}
              dot={dateRange === "7d" ? { r: 3, fill: "#0284c7" } : false}
              activeDot={{ r: 5, fill: "#0284c7" }}
            />
            {/* Lighter dashed line for previous period comparison */}
            {showComparison && (
              <Line
                type="monotone"
                dataKey="previous"
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={dateRange === "7d" ? { r: 2.5, fill: "#94a3b8" } : false}
                activeDot={{ r: 4, fill: "#94a3b8" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend */}
      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-[#0284c7]" />
            <span className="font-medium text-foreground">{t("anCurrent")} ({t(RANGE_LABEL[dateRange])})</span>
          </div>
          {showComparison && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-dashed border-[#94a3b8]" />
              <span>{t(COMPARE_LABEL[compareMode])}</span>
            </div>
          )}
        </div>
        <span className="tabular-nums text-xs text-muted-foreground">
          {t("anScope", { scope })}
        </span>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground border border-border/40">
        <span className="font-semibold text-foreground">{t("anExecutiveGuidance")} </span>
        {explanation}
      </div>
    </div>
  )
}

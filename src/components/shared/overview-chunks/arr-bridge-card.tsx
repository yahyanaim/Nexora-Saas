"use client"

import { useState, useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { change } from "@/lib/workforce/analytics"
import { RANGE_LABEL, RANGE_SHORT, formatChange, useAnalyticsFilter } from "./analytics-filter-context"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts"

interface ArrBarStep {
  label: string
  shortLabel: string
  amount: string
  numericValue: number
  delta: string
  type: "start" | "add" | "subtract" | "end"
  /** Where the bar starts and ends, as a share of the tallest point (waterfall) */
  bottom: number
  height: number
}

export function ArrBridgeCard() {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState<"bar" | "retention">("bar")
  const [chartView, setChartView] = useState<"components" | "trajectory">("components")
  const { dateRange, formatCurrency, formatBucket, analytics } = useAnalyticsFilter()

  const { steps, trajectoryData, netDeltaBadge, netPositive, headlineAmount, explanation, risks } = useMemo(() => {
    const { bridge, series, current, previous, risks: riskRows } = analytics
    const amount = (key: string) => bridge.find((b) => b.key === key)?.amount ?? 0
    const start = amount("start")
    const growth = amount("growth")
    const added = amount("new")
    const decline = amount("decline")
    const lost = amount("lost")
    const end = amount("end")
    const peak = Math.max(1, start, start + growth + added, end)
    const share = (n: number) => (n / peak) * 100
    const ofStart = (n: number) => (start > 0 ? formatChange((n / start) * 100) : "—")
    const afterAdds = start + growth + added
    const meta: { key: string; label: string; short: string; value: number; type: ArrBarStep["type"]; base: number }[] = [
      { key: "start", label: t("anBridgeStart"), short: t("anBridgeStartShort"), value: start, type: "start", base: 0 },
      { key: "growth", label: t("anBridgeGrowth"), short: t("anBridgeGrowthShort"), value: growth, type: "add", base: start },
      { key: "new", label: t("anBridgeNew"), short: t("anBridgeNewShort"), value: added, type: "add", base: start + growth },
      { key: "decline", label: t("anBridgeDecline"), short: t("anBridgeDeclineShort"), value: decline, type: "subtract", base: afterAdds - decline },
      { key: "lost", label: t("anBridgeLost"), short: t("anBridgeLostShort"), value: lost, type: "subtract", base: afterAdds - decline - lost },
      { key: "end", label: t("anBridgeEnd"), short: t("anBridgeEndShort"), value: end, type: "end", base: 0 },
    ]
    const stepItems: ArrBarStep[] = meta.map((m) => ({
      label: m.label,
      shortLabel: m.short,
      amount:
        m.type === "add" ? formatCurrency(m.value, { compact: true, signed: true })
        : m.type === "subtract" ? (m.value > 0 ? formatCurrency(-m.value, { compact: true }) : formatCurrency(0, { compact: true }))
        : formatCurrency(m.value, { compact: true }),
      numericValue: m.value,
      delta:
        m.type === "start" ? t("anBaseline")
        : m.type === "end" ? t("anNetChange", { change: formatChange(change(end, start)) })
        : m.type === "add" ? ofStart(m.value)
        : ofStart(m.value > 0 ? -m.value : 0),
      type: m.type,
      bottom: share(Math.max(0, m.base)),
      height: Math.max(m.value > 0 ? 3 : 0, share(m.value)),
    }))

    const traj = series.map((s) => ({ label: formatBucket(s.from), value: Math.round(s.revenue), formatted: formatCurrency(s.revenue) }))
    const net = end - start
    const top = analytics.clients[0]
    return {
      headlineAmount: formatCurrency(end, { compact: true }),
      netDeltaBadge: t("anNetFor", { amount: formatCurrency(net, { compact: true, signed: true }), period: RANGE_SHORT[dateRange] }),
      netPositive: net >= 0,
      steps: stepItems,
      trajectoryData: traj,
      risks: riskRows,
      explanation:
        start === 0 && end === 0
          ? t("anNoRevenueYet")
          : t("anBridgeNote", {
              growth: formatCurrency(growth + added, { compact: true }),
              loss: formatCurrency(decline + lost, { compact: true }),
              client: top?.name ?? "—",
              margin: current.margin === null ? "—" : `${Math.round(current.margin)}%`,
              before: previous.margin === null ? "—" : `${Math.round(previous.margin)}%`,
            }),
    }
  }, [analytics, dateRange, formatBucket, formatCurrency, t])

  const highRisk = risks.filter((r) => r.level === "high").length

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      {/* Header with Switcher Tabs */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">{t("anRevenueBridge")}</span>
            <span className="text-xs tabular-nums text-muted-foreground">({t(RANGE_LABEL[dateRange])})</span>
          </div>

          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("bar")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                activeTab === "bar"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("anBridgeTab")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("retention")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                activeTab === "retention"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t("anClientsAtRisk")}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "bar" ? (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground tabular-nums">
                  {headlineAmount}
                </span>
                <span className={cn("ms-2 text-xs font-semibold", netPositive ? "text-success-foreground" : "text-danger-foreground")}>
                  {netDeltaBadge}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {t("anProfitInline", {
                    profit: formatCurrency(analytics.current.profit, { compact: true }),
                    margin: analytics.current.margin === null ? "—" : `${Math.round(analytics.current.margin)}%`,
                  })}
                </span>
                {/* View toggle pill */}
                <div className="flex items-center rounded-md border border-border/50 bg-muted/40 p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartView("components")}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-medium transition-colors cursor-pointer",
                      chartView === "components"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("anComponents")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartView("trajectory")}
                    className={cn(
                      "rounded px-1.5 py-0.5 font-medium transition-colors cursor-pointer",
                      chartView === "trajectory"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t("anByPeriod")}
                  </button>
                </div>
              </div>
            </div>

            {/* Rounded Bar Chart Representation */}
            {chartView === "components" ? (
              <div className="grid grid-cols-6 gap-2 pt-1">
                {steps.map((step) => {
                  const isPositive = step.type === "add"
                  const isNegative = step.type === "subtract"
                  const isAnchor = step.type === "start" || step.type === "end"

                  return (
                    <div key={step.label} className="group flex flex-col items-center justify-end gap-1.5">
                      <span className="tabular-nums text-xs font-semibold text-foreground tracking-tight transition-transform group-hover:scale-105">
                        {step.amount}
                      </span>
                      
                      {/* Waterfall: each change floats where the running total is */}
                      <div className="relative h-28 w-full rounded-md bg-muted/30 transition-colors group-hover:bg-muted/50" title={step.label}>
                        <div className="absolute inset-1">
                          <div
                            style={{ bottom: `${step.bottom}%`, height: `${step.height}%` }}
                            className={cn(
                              "absolute inset-x-0 rounded-t-md rounded-b-none transition-all duration-300 shadow-2xs",
                              !isAnchor && "rounded-b-md",
                              isAnchor && "bg-primary shadow-primary/20",
                              isPositive && "bg-success shadow-emerald-500/20",
                              isNegative && "bg-destructive shadow-rose-500/20"
                            )}
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-center text-xs font-medium text-foreground line-clamp-1">
                          {step.shortLabel}
                        </span>
                        <span
                          className={cn(
                            "tabular-nums text-xs font-medium",
                            isPositive && "text-success-foreground",
                            isNegative && "text-danger-foreground",
                            isAnchor && "text-muted-foreground"
                          )}
                        >
                          {step.delta}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="h-32 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trajectoryData} margin={{ top: 8, right: 6, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/40" />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                      tickFormatter={(val) => formatCurrency(val, { compact: true })}
                    />
                    <Tooltip
                      cursor={{ fill: "currentColor", className: "text-muted/15" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0]
                          const data = item?.payload
                          if (!data) return null
                          return (
                            <div className="rounded-lg border border-border/80 bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur-md">
                              <p className="font-semibold text-foreground">{data.label}</p>
                              <p className="tabular-nums text-primary font-bold">{data.formatted}</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    {/* Clean modern rounded-top bars */}
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={28} className="fill-primary/85 hover:fill-primary transition-colors" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-2 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{t("anAtRiskTitle")}</span>
              <span className={cn("font-medium text-xs", highRisk > 0 ? "text-danger-foreground" : "text-muted-foreground")}>
                {t("anFlagged", { count: risks.length })}
              </span>
            </div>

            <div className="divide-y divide-border/40 text-xs">
              {risks.length === 0 && (
                <p className="py-6 text-center text-muted-foreground">{t("anNoRisks")}</p>
              )}
              {risks.slice(0, 4).map((account) => (
                <div key={account.clientId} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={cn(
                        "size-4 shrink-0",
                        account.level === "high" ? "text-danger-foreground" : "text-warning-foreground"
                      )}
                    />
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {account.reason === "overdue"
                          ? t("anRiskOverdue", { count: account.invoices ?? 0, days: account.overdueDays ?? 0 })
                          : account.reason === "quiet"
                          ? t("anRiskQuiet")
                          : t("anRiskDecline")}
                      </p>
                    </div>
                  </div>
                  <div className="text-end">
                    <span className="tabular-nums font-medium text-danger-foreground">
                      {account.reason === "overdue" ? formatCurrency(account.value) : formatChange(account.value)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {account.reason === "overdue" ? t("anOverdueLabel") : t("anRevenueChangeLabel")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">{t("anGrowthSummary")} </span>
        {explanation}
      </div>
    </div>
  )
}

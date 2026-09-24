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
import { useAnalyticsFilter } from "./analytics-filter-context"

const DATA_7_DAYS = [
  { date: "Jul 22", current: 165700, previous: 158900 },
  { date: "Jul 23", current: 166400, previous: 160200 },
  { date: "Jul 24", current: 167200, previous: 161500 },
  { date: "Jul 25", current: 167900, previous: 162800 },
  { date: "Jul 26", current: 168200, previous: 163900 },
  { date: "Jul 27", current: 168600, previous: 164800 },
  { date: "Jul 28", current: 168920, previous: 165400 },
]

const DATA_30_DAYS = [
  { date: "Jul 1", current: 135400, previous: 121000 },
  { date: "Jul 2", current: 136100, previous: 121400 },
  { date: "Jul 3", current: 136900, previous: 122200 },
  { date: "Jul 4", current: 138200, previous: 122800 },
  { date: "Jul 5", current: 141000, previous: 123500 },
  { date: "Jul 6", current: 142400, previous: 124100 },
  { date: "Jul 7", current: 143800, previous: 124800 },
  { date: "Jul 8", current: 145200, previous: 125300 },
  { date: "Jul 9", current: 147000, previous: 125900 },
  { date: "Jul 10", current: 148500, previous: 126400 },
  { date: "Jul 11", current: 151200, previous: 127200 },
  { date: "Jul 12", current: 152800, previous: 128000 },
  { date: "Jul 13", current: 153900, previous: 128900 },
  { date: "Jul 14", current: 156400, previous: 129500 },
  { date: "Jul 15", current: 157800, previous: 130200 },
  { date: "Jul 16", current: 158900, previous: 130800 },
  { date: "Jul 17", current: 160200, previous: 131400 },
  { date: "Jul 18", current: 161500, previous: 132100 },
  { date: "Jul 19", current: 162800, previous: 132700 },
  { date: "Jul 20", current: 163900, previous: 133200 },
  { date: "Jul 21", current: 164800, previous: 133800 },
  { date: "Jul 22", current: 165700, previous: 134200 },
  { date: "Jul 23", current: 166400, previous: 134700 },
  { date: "Jul 24", current: 167200, previous: 135000 },
  { date: "Jul 25", current: 167900, previous: 135200 },
  { date: "Jul 26", current: 168200, previous: 135300 },
  { date: "Jul 27", current: 168600, previous: 135400 },
  { date: "Jul 28", current: 168920, previous: 135400 },
]

const DATA_90_DAYS = [
  { date: "May 6", current: 122000, previous: 98000 },
  { date: "May 13", current: 125400, previous: 101000 },
  { date: "May 20", current: 129000, previous: 104500 },
  { date: "May 27", current: 133000, previous: 108000 },
  { date: "Jun 3", current: 136500, previous: 112000 },
  { date: "Jun 10", current: 141000, previous: 115500 },
  { date: "Jun 17", current: 146000, previous: 119000 },
  { date: "Jun 24", current: 151500, previous: 123000 },
  { date: "Jul 1", current: 155000, previous: 126500 },
  { date: "Jul 8", current: 159000, previous: 130000 },
  { date: "Jul 15", current: 162500, previous: 132500 },
  { date: "Jul 22", current: 166000, previous: 134000 },
  { date: "Jul 28", current: 168920, previous: 135400 },
]

const DATA_1_YEAR = [
  { date: "Oct", current: 84000, previous: 48000 },
  { date: "Nov", current: 89500, previous: 51000 },
  { date: "Dec", current: 94200, previous: 54500 },
  { date: "Jan", current: 98500, previous: 58000 },
  { date: "Feb", current: 108200, previous: 64000 },
  { date: "Mar", current: 119400, previous: 71000 },
  { date: "Apr", current: 131800, previous: 79000 },
  { date: "May", current: 144500, previous: 89000 },
  { date: "Jun", current: 156800, previous: 99500 },
  { date: "Jul", current: 168920, previous: 112000 },
  { date: "Aug", current: 178400, previous: 122000 },
  { date: "Sep", current: 189500, previous: 131000 },
]

const DATA_YTD = [
  { date: "Jan", current: 98500, previous: 58000 },
  { date: "Feb", current: 108200, previous: 64000 },
  { date: "Mar", current: 119400, previous: 71000 },
  { date: "Apr", current: 131800, previous: 79000 },
  { date: "May", current: 144500, previous: 89000 },
  { date: "Jun", current: 156800, previous: 99500 },
  { date: "Jul", current: 168920, previous: 112000 },
  { date: "Aug", current: 178400, previous: 122000 },
  { date: "Sep", current: 189500, previous: 131000 },
  { date: "Oct", current: 198000, previous: 142000 },
  { date: "Nov", current: 209000, previous: 153000 },
  { date: "Dec", current: 221000, previous: 165000 },
]

export function TotalSalesChart() {
  const {
    dateRange,
    compareMode,
    formatCurrency,
    currencySymbol,
    currencyRate,
    workspaceMultiplier,
    workspace,
  } = useAnalyticsFilter()

  const mult = currencyRate * workspaceMultiplier

  const { chartData, xTicks, deltaText, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      const data = DATA_7_DAYS.map((d) => ({
        date: d.date,
        current: Math.round(d.current * mult),
        previous: Math.round(d.previous * mult),
      }))
      return {
        chartData: data,
        xTicks: ["Jul 22", "Jul 23", "Jul 24", "Jul 25", "Jul 26", "Jul 27", "Jul 28"],
        deltaText: `+${formatCurrency(3520)} (+2.1%) vs prior 7d`,
        deltaPct: "+2.1%",
        explanation:
          "Past 7-day velocity: Daily recurring revenue run-rate measured across all provisioned workspaces over the past 7 days. Sustained daily expansion driven by team seat additions and active API token overages.",
      }
    }

    if (dateRange === "Last 90 days") {
      const data = DATA_90_DAYS.map((d) => ({
        date: d.date,
        current: Math.round(d.current * mult),
        previous: Math.round(d.previous * mult),
      }))
      return {
        chartData: data,
        xTicks: ["May 6", "May 27", "Jun 17", "Jul 8", "Jul 28"],
        deltaText: `+${formatCurrency(46920)} (+38.5%) vs prior 90d`,
        deltaPct: "+38.5%",
        explanation:
          "Quarterly telemetry: 90-day growth trajectory driven by 34 new enterprise annual agreements, dedicated VPC upgrades, and expanded developer API add-ons.",
      }
    }

    if (dateRange === "Last 1 year") {
      const data = DATA_1_YEAR.map((d) => ({
        date: d.date,
        current: Math.round(d.current * mult),
        previous: Math.round(d.previous * mult),
      }))
      return {
        chartData: data,
        xTicks: ["Oct", "Dec", "Feb", "Apr", "Jun", "Aug", "Sep"],
        deltaText: `+${formatCurrency(105500)} (+125.6%) vs prior year`,
        deltaPct: "+125.6%",
        explanation:
          "Trailing 12-month annual growth: Total monthly recurring revenue scaled from $84k to $189.5k over the past year, reflecting exceptional compound expansion across high-value enterprise accounts.",
      }
    }

    if (dateRange === "Year to date") {
      const data = DATA_YTD.map((d) => ({
        date: d.date,
        current: Math.round(d.current * mult),
        previous: Math.round(d.previous * mult),
      }))
      return {
        chartData: data,
        xTicks: ["Jan", "Mar", "May", "Jul", "Sep", "Nov"],
        deltaText: `+${formatCurrency(122500)} (+124.4%) vs Jan 1`,
        deltaPct: "+124.4%",
        explanation:
          "Year-to-date milestone: Annual recurring revenue run-rate scaled from initial baseline, pacing above plan with 118.4% net retention across all active enterprise accounts.",
      }
    }

    // Default: Last 30 days
    const data = DATA_30_DAYS.map((d) => ({
      date: d.date,
      current: Math.round(d.current * mult),
      previous: Math.round(d.previous * mult),
    }))
    return {
      chartData: data,
      xTicks: ["Jul 1", "Jul 7", "Jul 14", "Jul 21", "Jul 28"],
      deltaText: `+${formatCurrency(33520)} (+24.8%) vs prior 30d`,
      deltaPct: "+24.8%",
      explanation:
        "Daily recurring revenue run-rate measured across all provisioned enterprise and team workspaces. The sustained upward trajectory reflects 18 new Enterprise Tier annual contracts and strong expansion in compute token overages (+24.8% net growth).",
    }
  }, [dateRange, mult, formatCurrency])

  const latestCurrent = chartData[chartData.length - 1]?.current ?? 168920 * mult
  const arrRunRate = latestCurrent * 12

  // Compute dynamic domain based on data values
  const minVal = Math.min(...chartData.map((d) => (compareMode !== "No comparison" ? Math.min(d.current, d.previous) : d.current)))
  const maxVal = Math.max(...chartData.map((d) => (compareMode !== "No comparison" ? Math.max(d.current, d.previous) : d.current)))
  const yDomainMin = Math.max(0, Math.floor((minVal * 0.95) / 1000) * 1000)
  const yDomainMax = Math.ceil((maxVal * 1.05) / 1000) * 1000

  const showComparison = compareMode !== "No comparison"

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">MRR & Recurring Revenue Growth</span>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {dateRange}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {formatCurrency(latestCurrent / (currencyRate * workspaceMultiplier))}
          </span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {deltaText}
          </span>
          <span className="hidden sm:inline-block text-xs text-muted-foreground font-mono">
            (ARR: {formatCurrency(arrRunRate / (currencyRate * workspaceMultiplier), { compact: true })})
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
              tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`}
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
                      <p className="text-primary font-mono font-medium">
                        Current: {currencySymbol}{curr.toLocaleString()}
                      </p>
                      {prev !== null && (
                        <p className="text-muted-foreground font-mono text-[11px]">
                          {compareMode}: {currencySymbol}{prev.toLocaleString()}
                        </p>
                      )}
                      {delta !== null && (
                        <p className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                          Variance: {delta >= 0 ? "+" : ""}{currencySymbol}{delta.toLocaleString()}
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
              dot={dateRange === "Last 7 days" ? { r: 3, fill: "#0284c7" } : false}
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
                dot={dateRange === "Last 7 days" ? { r: 2.5, fill: "#94a3b8" } : false}
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
            <span className="font-medium text-foreground">Current ({dateRange})</span>
          </div>
          {showComparison && (
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-dashed border-[#94a3b8]" />
              <span>{compareMode}</span>
            </div>
          )}
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          Scope: {workspace}
        </span>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 rounded-lg bg-muted/30 p-2.5 text-xs text-muted-foreground border border-border/40">
        <span className="font-semibold text-foreground">Executive Guidance: </span>
        {explanation}
      </div>
    </div>
  )
}

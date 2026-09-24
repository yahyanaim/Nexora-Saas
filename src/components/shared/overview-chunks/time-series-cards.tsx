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

// 7-day daily throughput
const THROUGHPUT_7D = [
  { time: "Mon", current: 2200, previous: 1850 },
  { time: "Tue", current: 2450, previous: 1980 },
  { time: "Wed", current: 2680, previous: 2150 },
  { time: "Thu", current: 2590, previous: 2200 },
  { time: "Fri", current: 2840, previous: 2320 },
  { time: "Sat", current: 1920, previous: 1650 },
  { time: "Sun", current: 2050, previous: 1720 },
]

// 30-day hourly profile
const THROUGHPUT_30D = [
  { time: "12 AM", current: 1200, previous: 980 },
  { time: "2 AM", current: 1400, previous: 1100 },
  { time: "4 AM", current: 1300, previous: 1150 },
  { time: "6 AM", current: 1900, previous: 1500 },
  { time: "8 AM", current: 2800, previous: 2200 },
  { time: "10 AM", current: 3600, previous: 2900 },
  { time: "12 PM", current: 4100, previous: 3400 },
  { time: "2 PM", current: 4800, previous: 3900 },
  { time: "4 PM", current: 4400, previous: 3600 },
  { time: "6 PM", current: 3700, previous: 3100 },
  { time: "8 PM", current: 2900, previous: 2400 },
  { time: "10 PM", current: 2400, previous: 2000 },
]

// 90-day weekly profile
const THROUGHPUT_90D = [
  { time: "W1", current: 11200, previous: 9400 },
  { time: "W3", current: 12400, previous: 10100 },
  { time: "W5", current: 13800, previous: 11200 },
  { time: "W7", current: 14900, previous: 12400 },
  { time: "W9", current: 15800, previous: 13100 },
  { time: "W11", current: 16800, previous: 14200 },
]

// 1-year monthly profile (12 months)
const THROUGHPUT_1Y = [
  { time: "Oct", current: 36000, previous: 22000 },
  { time: "Nov", current: 39000, previous: 24000 },
  { time: "Dec", current: 42000, previous: 26000 },
  { time: "Jan", current: 45000, previous: 28000 },
  { time: "Feb", current: 51000, previous: 32000 },
  { time: "Mar", current: 58000, previous: 36000 },
  { time: "Apr", current: 62000, previous: 41000 },
  { time: "May", current: 67000, previous: 46000 },
  { time: "Jun", current: 71000, previous: 50000 },
  { time: "Jul", current: 74500, previous: 54000 },
  { time: "Aug", current: 79200, previous: 58000 },
  { time: "Sep", current: 84100, previous: 62000 },
]

// Year-to-date monthly profile
const THROUGHPUT_YTD = [
  { time: "Jan", current: 45000, previous: 28000 },
  { time: "Feb", current: 51000, previous: 32000 },
  { time: "Mar", current: 58000, previous: 36000 },
  { time: "Apr", current: 62000, previous: 41000 },
  { time: "May", current: 67000, previous: 46000 },
  { time: "Jun", current: 71000, previous: 50000 },
  { time: "Jul", current: 74500, previous: 54000 },
  { time: "Aug", current: 79200, previous: 58000 },
  { time: "Sep", current: 84100, previous: 62000 },
  { time: "Oct", current: 88500, previous: 66000 },
  { time: "Nov", current: 93200, previous: 70000 },
  { time: "Dec", current: 98000, previous: 75000 },
]

export function SessionOverTimeCard() {
  const { dateRange, compareMode } = useAnalyticsFilter()

  const { data, ticks, headline, unit, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      return {
        data: THROUGHPUT_7D,
        ticks: ["Mon", "Wed", "Fri", "Sun"],
        headline: "2.4M",
        unit: "req / day avg",
        explanation:
          "Past 7-day gateway volume: Traffic peaked on Friday at 2.84M requests with zero edge gateway dropouts and 99.99% uptime.",
      }
    }

    if (dateRange === "Last 90 days") {
      return {
        data: THROUGHPUT_90D,
        ticks: ["W1", "W5", "W9", "W11"],
        headline: "16.8M",
        unit: "req / wk",
        explanation:
          "Quarterly volume: Trailing 90-day throughput scaled +28% following customer rollout of automated webhook integrations.",
      }
    }

    if (dateRange === "Last 1 year") {
      return {
        data: THROUGHPUT_1Y,
        ticks: ["Oct", "Jan", "Apr", "Jul", "Sep"],
        headline: "84.1M",
        unit: "req / mo",
        explanation:
          "Trailing 12-month volume: Annual request throughput scaled +133% year-over-year with global edge distribution.",
      }
    }

    if (dateRange === "Year to date") {
      return {
        data: THROUGHPUT_YTD,
        ticks: ["Jan", "Apr", "Jul", "Oct", "Dec"],
        headline: "98.0M",
        unit: "req / mo",
        explanation:
          "Annual volume: Total cumulative requests processed through edge gateway clusters exceeding 780M requests year-to-date.",
      }
    }

    // Default: Last 30 days
    return {
      data: THROUGHPUT_30D,
      ticks: ["12 AM", "8 AM", "4 PM"],
      headline: "2.4M",
      unit: "req / hr",
      explanation:
        "Traffic peaks across global gateway clusters between 12 PM and 4 PM UTC. Median P99 latency is sustained at 42ms with zero edge gateway dropouts.",
    }
  }, [dateRange])

  const showComparison = compareMode !== "No comparison"

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">API Request Throughput</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {dateRange}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {headline}
          </span>
          <span className="text-xs text-muted-foreground">{unit}</span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            99.99% Uptime
          </span>
        </div>

        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: -25, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/40"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                ticks={ticks}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <span className="font-medium text-foreground">{label}: </span>
                      <span className="font-mono text-primary font-medium">
                        {payload[0]?.value}k req
                      </span>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="current"
                stroke="#0284c7"
                strokeWidth={1.75}
                dot={dateRange === "Last 7 days" ? { r: 2.5, fill: "#0284c7" } : false}
              />
              {showComparison && (
                <Line
                  type="monotone"
                  dataKey="previous"
                  stroke="#94a3b8"
                  strokeWidth={1.25}
                  strokeDasharray="2 2"
                  dot={false}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 border-t border-border/40 pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Throughput Telemetry: </span>
        {explanation}
      </div>
    </div>
  )
}

// ARPU Datasets per dateRange
const ARPU_7D = [
  { time: "Jul 22", value: 1168 },
  { time: "Jul 23", value: 1170 },
  { time: "Jul 24", value: 1172 },
  { time: "Jul 25", value: 1175 },
  { time: "Jul 26", value: 1176 },
  { time: "Jul 27", value: 1178 },
  { time: "Jul 28", value: 1180 },
]

const ARPU_30D = [
  { time: "W1", value: 1090 },
  { time: "W2", value: 1120 },
  { time: "W3", value: 1150 },
  { time: "W4", value: 1180 },
]

const ARPU_90D = [
  { time: "May", value: 980 },
  { time: "Jun", value: 1080 },
  { time: "Jul", value: 1180 },
]

const ARPU_1Y = [
  { time: "Oct", value: 820 },
  { time: "Nov", value: 850 },
  { time: "Dec", value: 870 },
  { time: "Jan", value: 890 },
  { time: "Feb", value: 920 },
  { time: "Mar", value: 950 },
  { time: "Apr", value: 990 },
  { time: "May", value: 1040 },
  { time: "Jun", value: 1090 },
  { time: "Jul", value: 1180 },
  { time: "Aug", value: 1240 },
  { time: "Sep", value: 1310 },
]

const ARPU_YTD = [
  { time: "Jan", value: 890 },
  { time: "Feb", value: 920 },
  { time: "Mar", value: 950 },
  { time: "Apr", value: 990 },
  { time: "May", value: 1040 },
  { time: "Jun", value: 1090 },
  { time: "Jul", value: 1180 },
  { time: "Aug", value: 1240 },
  { time: "Sep", value: 1310 },
  { time: "Oct", value: 1360 },
  { time: "Nov", value: 1410 },
  { time: "Dec", value: 1480 },
]

export function AverageOrderValueCard() {
  const { dateRange, currencySymbol, currencyRate, workspaceMultiplier } =
    useAnalyticsFilter()

  const mult = currencyRate * workspaceMultiplier

  const { data, ticks, deltaText, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      const converted = ARPU_7D.map((d) => ({ time: d.time, value: Math.round(d.value * mult) }))
      return {
        data: converted,
        ticks: ["Jul 22", "Jul 24", "Jul 26", "Jul 28"],
        deltaText: `+${currencySymbol}${Math.round(12 * mult)} (7d expansion)`,
        explanation:
          "Past 7-day ARPU: Active expansion compounding steadily as existing teams upgraded team seats and purchased additional AI compute credits.",
      }
    }

    if (dateRange === "Last 90 days") {
      const converted = ARPU_90D.map((d) => ({ time: d.time, value: Math.round(d.value * mult) }))
      return {
        data: converted,
        ticks: ["May", "Jun", "Jul"],
        deltaText: `+${currencySymbol}${Math.round(200 * mult)} (+20.4%)`,
        explanation:
          "Quarterly ARPU: Upward expansion driven by new enterprise contract commitments and custom SLA add-ons.",
      }
    }

    if (dateRange === "Last 1 year") {
      const converted = ARPU_1Y.map((d) => ({ time: d.time, value: Math.round(d.value * mult) }))
      return {
        data: converted,
        ticks: ["Oct", "Jan", "Apr", "Jul", "Sep"],
        deltaText: `+${currencySymbol}${Math.round(490 * mult)} (+59.8% YoY)`,
        explanation:
          "Trailing 12-month ARPU growth: Average contract value expanded from $820 to $1,310/mo as enterprise multi-product adoption matured.",
      }
    }

    if (dateRange === "Year to date") {
      const converted = ARPU_YTD.map((d) => ({ time: d.time, value: Math.round(d.value * mult) }))
      return {
        data: converted,
        ticks: ["Jan", "Apr", "Jul", "Oct", "Dec"],
        deltaText: `+${currencySymbol}${Math.round(590 * mult)} (+66.3% YTD)`,
        explanation:
          "Year-to-date ARPU expansion: Sustained +66.3% account expansion since January reflecting strong net revenue retention.",
      }
    }

    // Default: Last 30 days
    const converted = ARPU_30D.map((d) => ({ time: d.time, value: Math.round(d.value * mult) }))
    return {
      data: converted,
      ticks: ["W1", "W2", "W3", "W4"],
      deltaText: `+${currencySymbol}${Math.round(90 * mult)} (+8.2%)`,
      explanation:
        "Unit Economics: Account expansion is compounding at +4.8% MoM as customer teams add seats, enable webhook listeners, and upgrade compute tiers.",
    }
  }, [dateRange, mult, currencySymbol])

  const latestVal = data[data.length - 1]?.value ?? 1180 * mult
  const minVal = Math.min(...data.map((d) => d.value))
  const maxVal = Math.max(...data.map((d) => d.value))
  const yDomainMin = Math.max(0, Math.floor((minVal * 0.95) / 50) * 50)
  const yDomainMax = Math.ceil((maxVal * 1.05) / 50) * 50

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">Average Revenue Per Account (ARPU)</span>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground">
            {dateRange}
          </span>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
            {currencySymbol}{latestVal.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">/ mo</span>
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {deltaText}
          </span>
        </div>

        <div className="mt-3 h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-border/40"
              />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                ticks={ticks}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10 }}
                className="fill-muted-foreground"
                domain={[yDomainMin, yDomainMax]}
                tickFormatter={(v) => `${currencySymbol}${v}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="rounded-md border border-border/80 bg-popover px-2.5 py-1.5 text-xs shadow-md">
                      <span className="font-medium text-foreground">{label}: </span>
                      <span className="font-mono text-primary font-medium">
                        {currencySymbol}{payload[0]?.value} / account
                      </span>
                    </div>
                  )
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#0284c7"
                strokeWidth={1.75}
                dot={{ r: 2.5, fill: "#0284c7" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-3 border-t border-border/40 pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Unit Economics: </span>
        {explanation}
      </div>
    </div>
  )
}

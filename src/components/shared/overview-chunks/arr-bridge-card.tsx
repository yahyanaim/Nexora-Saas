"use client"

import { useState, useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalyticsFilter } from "./analytics-filter-context"
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
  color: string
}

const AT_RISK_ACCOUNTS = [
  { name: "Apex Logistics", tier: "Enterprise", seats: 45, usageDrop: "-34%", riskLevel: "high" },
  { name: "Skyline Media", tier: "Pro Team", seats: 18, usageDrop: "-22%", riskLevel: "medium" },
  { name: "DataFlow Systems", tier: "Enterprise", seats: 60, usageDrop: "-18%", riskLevel: "medium" },
]

export function ArrBridgeCard() {
  const [activeTab, setActiveTab] = useState<"bar" | "retention">("bar")
  const [chartView, setChartView] = useState<"components" | "trajectory">("components")
  const { dateRange, formatCurrency, currencyRate, workspaceMultiplier } = useAnalyticsFilter()

  const mult = currencyRate * workspaceMultiplier

  const { steps, trajectoryData, netDeltaBadge, headlineAmount, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      const stepItems: ArrBarStep[] = [
        { label: "Starting Run-rate", shortLabel: "Start", amount: formatCurrency(1968000, { compact: true }), numericValue: 1968000 * mult, delta: "7d Baseline", type: "start", color: "#3b82f6" },
        { label: "New Bookings", shortLabel: "+New", amount: `+${formatCurrency(14000, { compact: true })}`, numericValue: 140000 * mult, delta: "+0.7%", type: "add", color: "#10b981" },
        { label: "Seat Expansion", shortLabel: "+Expand", amount: `+${formatCurrency(18000, { compact: true })}`, numericValue: 180000 * mult, delta: "+0.9%", type: "add", color: "#10b981" },
        { label: "Contractions", shortLabel: "-Contr", amount: `-${formatCurrency(5000, { compact: true })}`, numericValue: 50000 * mult, delta: "-0.2%", type: "subtract", color: "#f43f5e" },
        { label: "Logo Churn", shortLabel: "-Churn", amount: `-${formatCurrency(3000, { compact: true })}`, numericValue: 30000 * mult, delta: "-0.1%", type: "subtract", color: "#f43f5e" },
        { label: "Ending Run-rate", shortLabel: "End", amount: formatCurrency(1992000, { compact: true }), numericValue: 1992000 * mult, delta: "+1.2% net", type: "end", color: "#6366f1" },
      ]

      const traj = [
        { label: "Jul 22", value: Math.round(1968000 * mult), formatted: formatCurrency(1968000, { compact: true }) },
        { label: "Jul 23", value: Math.round(1972000 * mult), formatted: formatCurrency(1972000, { compact: true }) },
        { label: "Jul 24", value: Math.round(1978000 * mult), formatted: formatCurrency(1978000, { compact: true }) },
        { label: "Jul 25", value: Math.round(1982000 * mult), formatted: formatCurrency(1982000, { compact: true }) },
        { label: "Jul 26", value: Math.round(1986000 * mult), formatted: formatCurrency(1986000, { compact: true }) },
        { label: "Jul 27", value: Math.round(1989000 * mult), formatted: formatCurrency(1989000, { compact: true }) },
        { label: "Jul 28", value: Math.round(1992000 * mult), formatted: formatCurrency(1992000, { compact: true }) },
      ]

      return {
        headlineAmount: formatCurrency(1992000, { compact: true }),
        netDeltaBadge: `+${formatCurrency(24000, { compact: true })} net 7d`,
        steps: stepItems,
        trajectoryData: traj,
        explanation:
          "Past 7-day ARR expansion: Net annualized expansion added +$24k over the last 7 days driven by 2 new enterprise tier upgrades and ongoing seat additions.",
      }
    }

    if (dateRange === "Last 90 days") {
      const stepItems: ArrBarStep[] = [
        { label: "Starting ARR", shortLabel: "Start", amount: formatCurrency(1450000, { compact: true }), numericValue: 1450000 * mult, delta: "Q2 Baseline", type: "start", color: "#3b82f6" },
        { label: "New Bookings", shortLabel: "+New", amount: `+${formatCurrency(360000, { compact: true })}`, numericValue: 360000 * mult, delta: "+24.8%", type: "add", color: "#10b981" },
        { label: "Seat Expansion", shortLabel: "+Expand", amount: `+${formatCurrency(265000, { compact: true })}`, numericValue: 265000 * mult, delta: "+18.3%", type: "add", color: "#10b981" },
        { label: "Contractions", shortLabel: "-Contr", amount: `-${formatCurrency(55000, { compact: true })}`, numericValue: 55000 * mult, delta: "-3.8%", type: "subtract", color: "#f43f5e" },
        { label: "Logo Churn", shortLabel: "-Churn", amount: `-${formatCurrency(28000, { compact: true })}`, numericValue: 28000 * mult, delta: "-1.9%", type: "subtract", color: "#f43f5e" },
        { label: "Ending ARR", shortLabel: "End", amount: formatCurrency(1992000, { compact: true }), numericValue: 1992000 * mult, delta: "+37.4% net", type: "end", color: "#6366f1" },
      ]

      const traj = [
        { label: "May W1", value: Math.round(1450000 * mult), formatted: formatCurrency(1450000, { compact: true }) },
        { label: "May W3", value: Math.round(1520000 * mult), formatted: formatCurrency(1520000, { compact: true }) },
        { label: "Jun W1", value: Math.round(1610000 * mult), formatted: formatCurrency(1610000, { compact: true }) },
        { label: "Jun W3", value: Math.round(1720000 * mult), formatted: formatCurrency(1720000, { compact: true }) },
        { label: "Jul W1", value: Math.round(1840000 * mult), formatted: formatCurrency(1840000, { compact: true }) },
        { label: "Jul W4", value: Math.round(1992000 * mult), formatted: formatCurrency(1992000, { compact: true }) },
      ]

      return {
        headlineAmount: formatCurrency(1992000, { compact: true }),
        netDeltaBadge: `+${formatCurrency(542000, { compact: true })} net 90d`,
        steps: stepItems,
        trajectoryData: traj,
        explanation:
          "Trailing 90-day expansion: Strong quarterly expansion fueled by multi-year enterprise commitments and dedicated SOC 2 pod deployments.",
      }
    }

    if (dateRange === "Last 1 year") {
      const stepItems: ArrBarStep[] = [
        { label: "Starting ARR", shortLabel: "Start", amount: formatCurrency(1150000, { compact: true }), numericValue: 1150000 * mult, delta: "1Y Baseline", type: "start", color: "#3b82f6" },
        { label: "New Bookings", shortLabel: "+New", amount: `+${formatCurrency(580000, { compact: true })}`, numericValue: 580000 * mult, delta: "+50.4%", type: "add", color: "#10b981" },
        { label: "Seat Expansion", shortLabel: "+Expand", amount: `+${formatCurrency(420000, { compact: true })}`, numericValue: 420000 * mult, delta: "+36.5%", type: "add", color: "#10b981" },
        { label: "Contractions", shortLabel: "-Contr", amount: `-${formatCurrency(98000, { compact: true })}`, numericValue: 98000 * mult, delta: "-8.5%", type: "subtract", color: "#f43f5e" },
        { label: "Logo Churn", shortLabel: "-Churn", amount: `-${formatCurrency(60000, { compact: true })}`, numericValue: 60000 * mult, delta: "-5.2%", type: "subtract", color: "#f43f5e" },
        { label: "Ending ARR", shortLabel: "End", amount: formatCurrency(1992000, { compact: true }), numericValue: 1992000 * mult, delta: "+73.2% net", type: "end", color: "#6366f1" },
      ]

      const traj = [
        { label: "Oct", value: Math.round(1150000 * mult), formatted: formatCurrency(1150000, { compact: true }) },
        { label: "Nov", value: Math.round(1210000 * mult), formatted: formatCurrency(1210000, { compact: true }) },
        { label: "Dec", value: Math.round(1280000 * mult), formatted: formatCurrency(1280000, { compact: true }) },
        { label: "Jan", value: Math.round(1350000 * mult), formatted: formatCurrency(1350000, { compact: true }) },
        { label: "Feb", value: Math.round(1440000 * mult), formatted: formatCurrency(1440000, { compact: true }) },
        { label: "Mar", value: Math.round(1540000 * mult), formatted: formatCurrency(1540000, { compact: true }) },
        { label: "Apr", value: Math.round(1640000 * mult), formatted: formatCurrency(1640000, { compact: true }) },
        { label: "May", value: Math.round(1730000 * mult), formatted: formatCurrency(1730000, { compact: true }) },
        { label: "Jun", value: Math.round(1830000 * mult), formatted: formatCurrency(1830000, { compact: true }) },
        { label: "Jul", value: Math.round(1910000 * mult), formatted: formatCurrency(1910000, { compact: true }) },
        { label: "Aug", value: Math.round(1950000 * mult), formatted: formatCurrency(1950000, { compact: true }) },
        { label: "Sep", value: Math.round(1992000 * mult), formatted: formatCurrency(1992000, { compact: true }) },
      ]

      return {
        headlineAmount: formatCurrency(1992000, { compact: true }),
        netDeltaBadge: `+${formatCurrency(842000, { compact: true })} net 1Y`,
        steps: stepItems,
        trajectoryData: traj,
        explanation:
          "Trailing 12-month ARR expansion: Annual contract value grew by +$842k net over the past year. High-expansion accounts in enterprise tiers outpaced logo churn by 16.7x, delivering a 118.4% net revenue retention benchmark.",
      }
    }

    if (dateRange === "Year to date") {
      const stepItems: ArrBarStep[] = [
        { label: "Starting ARR", shortLabel: "Start", amount: formatCurrency(1180000, { compact: true }), numericValue: 1180000 * mult, delta: "Jan 1 Baseline", type: "start", color: "#3b82f6" },
        { label: "New Bookings", shortLabel: "+New", amount: `+${formatCurrency(540000, { compact: true })}`, numericValue: 540000 * mult, delta: "+45.8%", type: "add", color: "#10b981" },
        { label: "Seat Expansion", shortLabel: "+Expand", amount: `+${formatCurrency(385000, { compact: true })}`, numericValue: 385000 * mult, delta: "+32.6%", type: "add", color: "#10b981" },
        { label: "Contractions", shortLabel: "-Contr", amount: `-${formatCurrency(72000, { compact: true })}`, numericValue: 72000 * mult, delta: "-6.1%", type: "subtract", color: "#f43f5e" },
        { label: "Logo Churn", shortLabel: "-Churn", amount: `-${formatCurrency(41000, { compact: true })}`, numericValue: 41000 * mult, delta: "-3.5%", type: "subtract", color: "#f43f5e" },
        { label: "Ending ARR", shortLabel: "End", amount: formatCurrency(1992000, { compact: true }), numericValue: 1992000 * mult, delta: "+68.8% net", type: "end", color: "#6366f1" },
      ]

      const traj = [
        { label: "Jan", value: Math.round(1180000 * mult), formatted: formatCurrency(1180000, { compact: true }) },
        { label: "Feb", value: Math.round(1280000 * mult), formatted: formatCurrency(1280000, { compact: true }) },
        { label: "Mar", value: Math.round(1410000 * mult), formatted: formatCurrency(1410000, { compact: true }) },
        { label: "Apr", value: Math.round(1540000 * mult), formatted: formatCurrency(1540000, { compact: true }) },
        { label: "May", value: Math.round(1680000 * mult), formatted: formatCurrency(1680000, { compact: true }) },
        { label: "Jun", value: Math.round(1840000 * mult), formatted: formatCurrency(1840000, { compact: true }) },
        { label: "Jul", value: Math.round(1940000 * mult), formatted: formatCurrency(1940000, { compact: true }) },
        { label: "Aug", value: Math.round(1970000 * mult), formatted: formatCurrency(1970000, { compact: true }) },
        { label: "Sep", value: Math.round(1992000 * mult), formatted: formatCurrency(1992000, { compact: true }) },
      ]

      return {
        headlineAmount: formatCurrency(1992000, { compact: true }),
        netDeltaBadge: `+${formatCurrency(812000, { compact: true })} net YTD`,
        steps: stepItems,
        trajectoryData: traj,
        explanation:
          "Year-to-date milestone: Annual recurring revenue run-rate has scaled from $1.18M to near the $2.0M milestone with minimal logo churn.",
      }
    }

    // Default: Last 30 days
    const stepItems: ArrBarStep[] = [
      { label: "Starting ARR", shortLabel: "Start", amount: formatCurrency(1620000, { compact: true }), numericValue: 1620000 * mult, delta: "Baseline", type: "start", color: "#3b82f6" },
      { label: "New Bookings", shortLabel: "+New", amount: `+${formatCurrency(240000, { compact: true })}`, numericValue: 240000 * mult, delta: "+14.8%", type: "add", color: "#10b981" },
      { label: "Seat Expansion", shortLabel: "+Expand", amount: `+${formatCurrency(185000, { compact: true })}`, numericValue: 185000 * mult, delta: "+11.4%", type: "add", color: "#10b981" },
      { label: "Contractions", shortLabel: "-Contr", amount: `-${formatCurrency(35000, { compact: true })}`, numericValue: 35000 * mult, delta: "-2.1%", type: "subtract", color: "#f43f5e" },
      { label: "Logo Churn", shortLabel: "-Churn", amount: `-${formatCurrency(18000, { compact: true })}`, numericValue: 18000 * mult, delta: "-1.1%", type: "subtract", color: "#f43f5e" },
      { label: "Ending ARR", shortLabel: "End", amount: formatCurrency(1992000, { compact: true }), numericValue: 1992000 * mult, delta: "+23.0% net", type: "end", color: "#6366f1" },
    ]

    const traj = [
      { label: "Week 1", value: Math.round(1620000 * mult), formatted: formatCurrency(1620000, { compact: true }) },
      { label: "Week 2", value: Math.round(1710000 * mult), formatted: formatCurrency(1710000, { compact: true }) },
      { label: "Week 3", value: Math.round(1830000 * mult), formatted: formatCurrency(1830000, { compact: true }) },
      { label: "Week 4", value: Math.round(1992000 * mult), formatted: formatCurrency(1992000, { compact: true }) },
    ]

    return {
      headlineAmount: formatCurrency(1992000, { compact: true }),
      netDeltaBadge: `+${formatCurrency(372000, { compact: true })} net YoY`,
      steps: stepItems,
      trajectoryData: traj,
      explanation:
        "The ARR expansion bar measures net annual contract value flow. Expansion and new bookings outpaced churn and contraction by 10.5x, achieving a 118.4% net revenue retention benchmark.",
    }
  }, [dateRange, formatCurrency, mult])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      {/* Header with Switcher Tabs */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">ARR Expansion Dynamics & Retention</span>
            <span className="text-[10px] font-mono text-muted-foreground">({dateRange})</span>
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
              ARR Growth
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
              Churn Risk Matrix
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "bar" ? (
          <div className="mt-2 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {headlineAmount}
                </span>
                <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {netDeltaBadge}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">
                  Target: {formatCurrency(2200000, { compact: true })} (90.5%)
                </span>
                {/* View toggle pill */}
                <div className="flex items-center rounded-md border border-border/50 bg-muted/40 p-0.5 text-[10px]">
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
                    Components
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
                    Monthly
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
                      <span className="font-mono text-[11px] font-semibold text-foreground tracking-tight transition-transform group-hover:scale-105">
                        {step.amount}
                      </span>
                      
                      {/* Modern Bar Container with clean rounded-top bar */}
                      <div className="flex h-28 w-full items-end justify-center rounded-md bg-muted/30 p-1 transition-colors group-hover:bg-muted/50">
                        <div
                          style={{
                            height: isAnchor
                              ? `${step.type === "start" ? 72 : 88}%`
                              : isPositive
                              ? `${step.shortLabel === "+New" ? 44 : 36}%`
                              : `${step.shortLabel === "-Contr" ? 22 : 16}%`,
                          }}
                          className={cn(
                            "w-full rounded-t-md rounded-b-none transition-all duration-300 shadow-2xs",
                            isAnchor && "bg-primary shadow-primary/20",
                            isPositive && "bg-emerald-500 shadow-emerald-500/20",
                            isNegative && "bg-rose-500 shadow-rose-500/20"
                          )}
                        />
                      </div>

                      <div className="flex flex-col items-center">
                        <span className="text-center text-[10px] font-medium text-foreground line-clamp-1">
                          {step.shortLabel}
                        </span>
                        <span
                          className={cn(
                            "font-mono text-[9px] font-medium",
                            isPositive && "text-emerald-600 dark:text-emerald-400",
                            isNegative && "text-rose-600 dark:text-rose-400",
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
                              <p className="font-mono text-primary font-bold">{data.formatted}</p>
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
              <span className="font-medium text-foreground">At-Risk Accounts Requiring Intervention</span>
              <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">3 accounts flagged</span>
            </div>

            <div className="divide-y divide-border/40 text-xs">
              {AT_RISK_ACCOUNTS.map((account) => (
                <div key={account.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <ShieldAlert
                      className={cn(
                        "size-4 shrink-0",
                        account.riskLevel === "high" ? "text-rose-500" : "text-amber-500"
                      )}
                    />
                    <div>
                      <p className="font-medium text-foreground">{account.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {account.tier} · {account.seats} seats
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-medium text-rose-600 dark:text-rose-400">
                      {account.usageDrop}
                    </span>
                    <p className="text-[10px] text-muted-foreground">30d activity drop</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Executive Growth Summary: </span>
        {explanation}
      </div>
    </div>
  )
}

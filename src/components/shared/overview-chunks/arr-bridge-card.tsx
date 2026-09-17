"use client"

import { useState, useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAnalyticsFilter } from "./analytics-filter-context"

interface WaterfallStep {
  label: string
  amount: string
  delta: string
  type: "start" | "add" | "subtract" | "end"
  heightPct: number
}

const AT_RISK_ACCOUNTS = [
  { name: "Apex Logistics", tier: "Enterprise", seats: 45, usageDrop: "-34%", riskLevel: "high" },
  { name: "Skyline Media", tier: "Pro Team", seats: 18, usageDrop: "-22%", riskLevel: "medium" },
  { name: "DataFlow Systems", tier: "Enterprise", seats: 60, usageDrop: "-18%", riskLevel: "medium" },
]

export function ArrBridgeCard() {
  const [activeTab, setActiveTab] = useState<"bridge" | "retention">("bridge")
  const { dateRange, formatCurrency } = useAnalyticsFilter()

  const { steps, netDeltaBadge, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      return {
        netDeltaBadge: `+${formatCurrency(24000, { compact: true })} net 7d`,
        steps: [
          { label: "Starting Run-rate", amount: formatCurrency(1968000, { compact: true }), delta: "7d Baseline", type: "start", heightPct: 78 },
          { label: "New Bookings", amount: `+${formatCurrency(14000, { compact: true })}`, delta: "+0.7%", type: "add", heightPct: 24 },
          { label: "Seat Expansion", amount: `+${formatCurrency(18000, { compact: true })}`, delta: "+0.9%", type: "add", heightPct: 28 },
          { label: "Contractions", amount: `-${formatCurrency(5000, { compact: true })}`, delta: "-0.2%", type: "subtract", heightPct: 12 },
          { label: "Logo Churn", amount: `-${formatCurrency(3000, { compact: true })}`, delta: "-0.1%", type: "subtract", heightPct: 8 },
          { label: "Ending Run-rate", amount: formatCurrency(1992000, { compact: true }), delta: "+1.2% net", type: "end", heightPct: 88 },
        ] as WaterfallStep[],
        explanation:
          "Past 7-day ARR bridge: Net annualized expansion added +$24k over the last 7 days driven by 2 new enterprise tier upgrades and ongoing seat additions.",
      }
    }

    if (dateRange === "Last 90 days") {
      return {
        netDeltaBadge: `+${formatCurrency(542000, { compact: true })} net 90d`,
        steps: [
          { label: "Starting ARR", amount: formatCurrency(1450000, { compact: true }), delta: "Q2 Baseline", type: "start", heightPct: 58 },
          { label: "New Bookings", amount: `+${formatCurrency(360000, { compact: true })}`, delta: "+24.8%", type: "add", heightPct: 42 },
          { label: "Seat Expansion", amount: `+${formatCurrency(265000, { compact: true })}`, delta: "+18.3%", type: "add", heightPct: 34 },
          { label: "Contractions", amount: `-${formatCurrency(55000, { compact: true })}`, delta: "-3.8%", type: "subtract", heightPct: 18 },
          { label: "Logo Churn", amount: `-${formatCurrency(28000, { compact: true })}`, delta: "-1.9%", type: "subtract", heightPct: 12 },
          { label: "Ending ARR", amount: formatCurrency(1992000, { compact: true }), delta: "+37.4% net", type: "end", heightPct: 88 },
        ] as WaterfallStep[],
        explanation:
          "Trailing 90-day waterfall: Strong quarterly expansion fueled by multi-year enterprise commitments and SOC 2 pod deployments.",
      }
    }

    if (dateRange === "Year to date") {
      return {
        netDeltaBadge: `+${formatCurrency(812000, { compact: true })} net YTD`,
        steps: [
          { label: "Starting ARR", amount: formatCurrency(1180000, { compact: true }), delta: "Jan 1 Baseline", type: "start", heightPct: 45 },
          { label: "New Bookings", amount: `+${formatCurrency(540000, { compact: true })}`, delta: "+45.8%", type: "add", heightPct: 50 },
          { label: "Seat Expansion", amount: `+${formatCurrency(385000, { compact: true })}`, delta: "+32.6%", type: "add", heightPct: 40 },
          { label: "Contractions", amount: `-${formatCurrency(72000, { compact: true })}`, delta: "-6.1%", type: "subtract", heightPct: 18 },
          { label: "Logo Churn", amount: `-${formatCurrency(41000, { compact: true })}`, delta: "-3.5%", type: "subtract", heightPct: 14 },
          { label: "Ending ARR", amount: formatCurrency(1992000, { compact: true }), delta: "+68.8% net", type: "end", heightPct: 88 },
        ] as WaterfallStep[],
        explanation:
          "Year-to-date milestone: Annual recurring revenue run-rate has scaled from $1.18M to near the $2.0M milestone with minimal logo churn.",
      }
    }

    // Default: Last 30 days
    return {
      netDeltaBadge: `+${formatCurrency(372000, { compact: true })} net YoY`,
      steps: [
        { label: "Starting ARR", amount: formatCurrency(1620000, { compact: true }), delta: "Baseline", type: "start", heightPct: 65 },
        { label: "New Bookings", amount: `+${formatCurrency(240000, { compact: true })}`, delta: "+14.8%", type: "add", heightPct: 35 },
        { label: "Seat Expansion", amount: `+${formatCurrency(185000, { compact: true })}`, delta: "+11.4%", type: "add", heightPct: 28 },
        { label: "Contractions", amount: `-${formatCurrency(35000, { compact: true })}`, delta: "-2.1%", type: "subtract", heightPct: 15 },
        { label: "Logo Churn", amount: `-${formatCurrency(18000, { compact: true })}`, delta: "-1.1%", type: "subtract", heightPct: 10 },
        { label: "Ending ARR", amount: formatCurrency(1992000, { compact: true }), delta: "+23.0% net", type: "end", heightPct: 88 },
      ] as WaterfallStep[],
      explanation:
        "The ARR expansion waterfall measures net annual contract value flow. Expansion and new bookings outpaced churn and contraction by 10.5x, achieving a 118.4% net revenue retention benchmark.",
    }
  }, [dateRange, formatCurrency])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      {/* Header with Switcher Tabs */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">ARR Expansion Bridge & Retention</span>
            <span className="text-[10px] font-mono text-muted-foreground">({dateRange})</span>
          </div>

          <div className="flex items-center rounded-lg border border-border/60 bg-muted/30 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("bridge")}
              className={cn(
                "rounded-md px-2.5 py-1 font-medium transition-colors cursor-pointer",
                activeTab === "bridge"
                  ? "bg-card text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ARR Waterfall
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
        {activeTab === "bridge" ? (
          <div className="mt-2 space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {formatCurrency(1992000, { compact: true })}
                </span>
                <span className="ml-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {netDeltaBadge}
                </span>
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                Target: {formatCurrency(2200000, { compact: true })} (90.5%)
              </span>
            </div>

            {/* Waterfall Visual Bars */}
            <div className="grid grid-cols-6 gap-2 pt-2">
              {steps.map((step) => {
                const isPositive = step.type === "add"
                const isNegative = step.type === "subtract"
                const isAnchor = step.type === "start" || step.type === "end"

                return (
                  <div key={step.label} className="flex flex-col items-center justify-end gap-1.5">
                    <span className="font-mono text-[11px] font-semibold text-foreground">
                      {step.amount}
                    </span>
                    <div className="flex h-24 w-full items-end justify-center rounded-sm bg-muted/30 p-1">
                      <div
                        style={{ height: `${step.heightPct}%` }}
                        className={cn(
                          "w-full rounded-xs transition-all",
                          isAnchor && "bg-primary/80 dark:bg-primary",
                          isPositive && "bg-emerald-500/80 dark:bg-emerald-500",
                          isNegative && "bg-rose-500/80 dark:bg-rose-500"
                        )}
                      />
                    </div>
                    <span className="text-center text-[10px] text-muted-foreground line-clamp-1">
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
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

"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { useAnalyticsFilter } from "./analytics-filter-context"

interface BreakdownItem {
  label: string
  amount: string
  trend?: "up" | "down" | "none"
}

function MiniWaveSparkline({ trend }: { trend: "up" | "down" | "none" }) {
  if (trend === "none") {
    return <span className="text-muted-foreground text-xs">-</span>
  }

  const isUp = trend === "up"
  const color = isUp ? "#10b981" : "#ef4444"

  return (
    <svg width="28" height="14" viewBox="0 0 28 14" fill="none" className="shrink-0">
      {isUp ? (
        <path
          d="M1 10 L5 8 L10 11 L16 5 L21 8 L27 2"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M1 3 L6 6 L12 2 L18 9 L23 7 L27 12"
          stroke={color}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  )
}

export function SalesBreakdownCard() {
  const { dateRange, formatCurrency } = useAnalyticsFilter()

  const { items, badgeText, totalAmount, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      return {
        badgeText: "7d Total",
        totalAmount: formatCurrency(41280),
        items: [
          { label: "Enterprise Tier Subscriptions", amount: formatCurrency(23100), trend: "up" },
          { label: "Pro Team Workspaces", amount: formatCurrency(11800), trend: "up" },
          { label: "AI Compute & Token Overages", amount: formatCurrency(4520), trend: "up" },
          { label: "Dedicated Cloud Pods & SLA", amount: formatCurrency(3080), trend: "up" },
          { label: "Developer API Add-ons", amount: formatCurrency(1680), trend: "up" },
          { label: "Expansion & Seat Upgrades", amount: formatCurrency(2010), trend: "up" },
          { label: "Discounts & Promotional Credits", amount: formatCurrency(-2750), trend: "down" },
          { label: "Contractions & Churned Seats", amount: formatCurrency(-2160), trend: "down" },
        ] as BreakdownItem[],
        explanation:
          "Past 7-day ledger: Enterprise commitments generated 56% of total 7-day revenue, while AI token overages represent the fastest-growing weekly margin driver.",
      }
    }

    if (dateRange === "Last 90 days") {
      return {
        badgeText: "90d Total",
        totalAmount: formatCurrency(506760),
        items: [
          { label: "Enterprise Tier Subscriptions", amount: formatCurrency(283500), trend: "up" },
          { label: "Pro Team Workspaces", amount: formatCurrency(144600), trend: "up" },
          { label: "AI Compute & Token Overages", amount: formatCurrency(55350), trend: "up" },
          { label: "Dedicated Cloud Pods & SLA", amount: formatCurrency(37800), trend: "up" },
          { label: "Developer API Add-ons", amount: formatCurrency(20460), trend: "up" },
          { label: "Expansion & Seat Upgrades", amount: formatCurrency(24450), trend: "up" },
          { label: "Discounts & Promotional Credits", amount: formatCurrency(-33600), trend: "down" },
          { label: "Contractions & Churned Seats", amount: formatCurrency(-25800), trend: "down" },
        ] as BreakdownItem[],
        explanation:
          "Quarterly ledger: Enterprise commitments expanded by 34% over 90 days, with compute infrastructure scaling alongside customer traffic.",
      }
    }

    if (dateRange === "Last 1 year") {
      return {
        badgeText: "1Y ARR",
        totalAmount: formatCurrency(1992000),
        items: [
          { label: "Enterprise Tier Subscriptions", amount: formatCurrency(1115000), trend: "up" },
          { label: "Pro Team Workspaces", amount: formatCurrency(568000), trend: "up" },
          { label: "AI Compute & Token Overages", amount: formatCurrency(218000), trend: "up" },
          { label: "Dedicated Cloud Pods & SLA", amount: formatCurrency(148000), trend: "up" },
          { label: "Developer API Add-ons", amount: formatCurrency(81000), trend: "up" },
          { label: "Expansion & Seat Upgrades", amount: formatCurrency(96000), trend: "up" },
          { label: "Discounts & Promotional Credits", amount: formatCurrency(-132000), trend: "down" },
          { label: "Contractions & Churned Seats", amount: formatCurrency(-102000), trend: "down" },
        ] as BreakdownItem[],
        explanation:
          "Trailing 12-month ledger: Annual recognized contract value of $1.99M with enterprise multi-year subscriptions contributing over 56% of total ARR flow.",
      }
    }

    if (dateRange === "Year to date") {
      return {
        badgeText: "YTD Total",
        totalAmount: formatCurrency(1689200),
        items: [
          { label: "Enterprise Tier Subscriptions", amount: formatCurrency(945000), trend: "up" },
          { label: "Pro Team Workspaces", amount: formatCurrency(482000), trend: "up" },
          { label: "AI Compute & Token Overages", amount: formatCurrency(185000), trend: "up" },
          { label: "Dedicated Cloud Pods & SLA", amount: formatCurrency(126000), trend: "up" },
          { label: "Developer API Add-ons", amount: formatCurrency(68000), trend: "up" },
          { label: "Expansion & Seat Upgrades", amount: formatCurrency(81500), trend: "up" },
          { label: "Discounts & Promotional Credits", amount: formatCurrency(-112000), trend: "down" },
          { label: "Contractions & Churned Seats", amount: formatCurrency(-86300), trend: "down" },
        ] as BreakdownItem[],
        explanation:
          "Annual ledger: Cumulative subscription run-rate compounding at +4.8% MoM across enterprise accounts and usage add-ons.",
      }
    }

    // Default: Last 30 days
    return {
      badgeText: "30d MRR",
      totalAmount: formatCurrency(168920),
      items: [
        { label: "Enterprise Tier Subscriptions", amount: formatCurrency(94500), trend: "up" },
        { label: "Pro Team Workspaces", amount: formatCurrency(48200), trend: "up" },
        { label: "AI Compute & Token Overages", amount: formatCurrency(18450), trend: "up" },
        { label: "Dedicated Cloud Pods & SLA", amount: formatCurrency(12600), trend: "up" },
        { label: "Developer API Add-ons", amount: formatCurrency(6820), trend: "up" },
        { label: "Expansion & Seat Upgrades", amount: formatCurrency(8150), trend: "up" },
        { label: "Discounts & Promotional Credits", amount: formatCurrency(-11200), trend: "down" },
        { label: "Contractions & Churned Seats", amount: formatCurrency(-8600), trend: "down" },
      ] as BreakdownItem[],
      explanation:
        "Enterprise commitments generate 56% of total revenue, while AI token overages represent the fastest-growing margin driver (+38% QoQ).",
    }
  }, [dateRange, formatCurrency])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">SaaS Revenue Breakdown</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-primary">
            {totalAmount} ({badgeText})
          </span>
        </div>

        {/* Items List */}
        <div className="divide-y divide-border/40 text-xs">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between py-2 transition-colors hover:bg-muted/20"
            >
              <span className="text-foreground/90 font-normal truncate pr-2">
                {item.label}
              </span>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-medium text-foreground">
                  {item.amount}
                </span>
                <div className="w-7 flex justify-end">
                  <MiniWaveSparkline trend={item.trend ?? "none"} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Ledger Analysis: </span>
        {explanation}
      </div>
    </div>
  )
}

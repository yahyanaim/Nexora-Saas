"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { useAnalyticsFilter } from "./analytics-filter-context"

interface SparklineBarProps {
  heights: number[] // heights between 0 and 100
  className?: string
}

function MiniBarSparkline({ heights, className }: SparklineBarProps) {
  return (
    <div className={cn("flex items-end gap-1 h-8 shrink-0", className)}>
      {heights.map((h, i) => (
        <div
          key={i}
          style={{ height: `${Math.max(15, h)}%` }}
          className="w-1.5 rounded-full bg-muted-foreground/25 dark:bg-muted-foreground/35 transition-all hover:bg-primary"
        />
      ))}
    </div>
  )
}

interface KpiCardData {
  title: string
  value: string
  change: string
  isPositive: boolean
  sparkline: number[]
  description: string
  explanation: string
}

export function AnalyticsKpiCards() {
  const { dateRange, formatCurrency, workspaceMultiplier } = useAnalyticsFilter()

  const kpiMetrics: KpiCardData[] = useMemo(() => {
    if (dateRange === "Last 7 days") {
      const rev7d = 41280
      const activeWorkspaces = Math.round(1428 * workspaceMultiplier)
      return [
        {
          title: "Period Revenue (7d Velocity)",
          value: formatCurrency(rev7d),
          change: "+2.1%",
          isPositive: true,
          sparkline: [55, 68, 72, 65, 84, 92, 100], // 7 bars for 7 days
          description: "Revenue velocity across all active enterprise and team accounts during the past 7 days.",
          explanation: "Past 7-day revenue velocity across all active accounts. Compounding toward the $200k monthly target.",
        },
        {
          title: "Net Revenue Retention",
          value: "118.4%",
          change: "+0.8%",
          isPositive: true,
          sparkline: [88, 90, 89, 92, 94, 96, 98], // 7 bars
          description: "7-day rolling retention including seat upgrades and token expansions.",
          explanation: "Measures 7-day retained revenue (>110% indicates healthy expansion pace).",
        },
        {
          title: "Active Workspaces",
          value: activeWorkspaces.toLocaleString(),
          change: "+18 new",
          isPositive: true,
          sparkline: [60, 68, 72, 78, 85, 92, 98], // 7 bars
          description: "Tenant clusters actively processing production API traffic during the past 7 days.",
          explanation: "18 new multi-tenant workspace clusters provisioned across cloud regions in the last 7 days.",
        },
        {
          title: "Customer Churn Rate",
          value: "1.2%",
          change: "-0.1%",
          isPositive: true,
          sparkline: [40, 36, 34, 30, 28, 25, 22], // 7 bars
          description: "7-day logo and subscription contraction churn rate across all tiers.",
          explanation: "Logo contraction decreased by 0.1% over the past 7 days following proactive account monitoring.",
        },
      ]
    }

    if (dateRange === "Last 90 days") {
      const rev90d = 482400
      const activeWorkspaces = Math.round(1428 * workspaceMultiplier)
      return [
        {
          title: "Quarterly Revenue Run-rate",
          value: formatCurrency(rev90d),
          change: "+38.5%",
          isPositive: true,
          sparkline: [35, 42, 48, 55, 62, 68, 74, 80, 85, 90, 95, 100], // 12 weeks
          description: "Quarterly recurring revenue across all enterprise commitments.",
          explanation: "Quarterly billing volume expanded by 38.5% driven by 34 new enterprise tier contracts.",
        },
        {
          title: "Net Revenue Retention",
          value: "118.4%",
          change: "+7.4%",
          isPositive: true,
          sparkline: [82, 85, 88, 90, 92, 93, 94, 95, 96, 97, 98, 99],
          description: "Trailing 90-day retention and seat expansion.",
          explanation: "Strong enterprise expansion across accounts adding dedicated SOC 2 pods and API add-ons.",
        },
        {
          title: "Active Workspaces",
          value: activeWorkspaces.toLocaleString(),
          change: "+34.2%",
          isPositive: true,
          sparkline: [25, 32, 40, 48, 56, 64, 72, 80, 85, 90, 94, 98],
          description: "Multi-tenant cloud workspaces deployed across production clusters.",
          explanation: "Rapid tenant onboarding following the launch of self-service workspace provisioning.",
        },
        {
          title: "Customer Churn Rate",
          value: "1.2%",
          change: "-1.1%",
          isPositive: true,
          sparkline: [85, 78, 72, 65, 58, 52, 46, 40, 35, 30, 26, 22],
          description: "Quarterly contraction rate across all tiers.",
          explanation: "Logo contraction decreased by 1.1% over the 90-day period.",
        },
      ]
    }

    if (dateRange === "Last 1 year") {
      const rev1y = 1992000
      const activeWorkspaces = Math.round(2840 * workspaceMultiplier)
      return [
        {
          title: "Annualized Run-rate (ARR)",
          value: formatCurrency(rev1y),
          change: "+118.4% YoY",
          isPositive: true,
          sparkline: [24, 30, 38, 46, 55, 63, 72, 80, 86, 91, 96, 100], // 12 months
          description: "Total contracted annual recurring revenue across all enterprise and team tiers.",
          explanation: "SaaS annual recurring revenue scaled to $1.99M over the past year with 118.4% net revenue retention.",
        },
        {
          title: "Net Revenue Retention",
          value: "118.4%",
          change: "+14.2%",
          isPositive: true,
          sparkline: [75, 80, 84, 88, 91, 93, 95, 96, 97, 98, 99, 100],
          description: "Annualized customer lifetime retention.",
          explanation: "Net retention compounding steadily as customer product adoption matures.",
        },
        {
          title: "Active Workspaces",
          value: activeWorkspaces.toLocaleString(),
          change: "+112.5%",
          isPositive: true,
          sparkline: [18, 26, 36, 48, 58, 68, 76, 84, 89, 93, 97, 100],
          description: "Active tenant organizations onboarded over the past 12 months.",
          explanation: "More than doubled active multi-tenant clusters provisioned across global regions.",
        },
        {
          title: "Customer Churn Rate",
          value: "1.2%",
          change: "-2.4%",
          isPositive: true,
          sparkline: [95, 86, 76, 65, 54, 44, 35, 28, 24, 20, 16, 12],
          description: "Annualized logo churn rate across all tiers.",
          explanation: "Sub-1.5% churn benchmark sustained throughout the trailing 12 months.",
        },
      ]
    }

    if (dateRange === "Year to date") {
      const revYtd = 1689200
      const activeWorkspaces = Math.round(2450 * workspaceMultiplier)
      return [
        {
          title: "Year-to-Date Revenue",
          value: formatCurrency(revYtd),
          change: "+94.2%",
          isPositive: true,
          sparkline: [25, 32, 40, 48, 56, 64, 72, 80, 86, 91, 95, 100], // 12 months
          description: "Cumulative revenue recognized since January 1.",
          explanation: "Pacing 22% above annual target with accelerating enterprise pipeline.",
        },
        {
          title: "Net Revenue Retention",
          value: "118.4%",
          change: "+12.6%",
          isPositive: true,
          sparkline: [78, 82, 86, 90, 93, 96, 99, 100, 100, 101, 102, 103],
          description: "Annualized customer lifetime retention.",
          explanation: "Net retention compounding steadily as customer usage matures.",
        },
        {
          title: "Active Workspaces",
          value: activeWorkspaces.toLocaleString(),
          change: "+84.0%",
          isPositive: true,
          sparkline: [20, 32, 46, 60, 74, 88, 92, 95, 97, 98, 99, 100],
          description: "Active tenant organizations onboarded this year.",
          explanation: "84% annual growth in active provisioned multi-tenant clusters.",
        },
        {
          title: "Customer Churn Rate",
          value: "1.2%",
          change: "-1.8%",
          isPositive: true,
          sparkline: [90, 80, 70, 58, 46, 34, 28, 25, 22, 18, 15, 12],
          description: "Annualized logo churn rate.",
          explanation: "Sustained sub-1.5% churn tier benchmark across the platform.",
        },
      ]
    }

    // Default: Last 30 days
    const rev30d = 168920
    const activeWorkspaces = Math.round(1428 * workspaceMultiplier)
    return [
      {
        title: "Monthly Recurring Revenue",
        value: formatCurrency(rev30d),
        change: "+24.8%",
        isPositive: true,
        sparkline: [35, 45, 60, 50, 75, 90, 85, 100],
        description: "Normalized monthly recurring revenue across all enterprise and team subscriptions.",
        explanation: "Contracted MRR across all active enterprise and team accounts. Pacing toward the $200k Q4 target.",
      },
      {
        title: "Net Revenue Retention",
        value: "118.4%",
        change: "+4.2%",
        isPositive: true,
        sparkline: [85, 88, 90, 86, 92, 95, 94, 98],
        description: "Recurring revenue retained from existing accounts including expansions and compute overages.",
        explanation: "Measures revenue retained from existing accounts including seat upgrades and AI compute add-ons (>110% indicates healthy expansion).",
      },
      {
        title: "Active Workspaces",
        value: activeWorkspaces.toLocaleString(),
        change: "+18.5%",
        isPositive: true,
        sparkline: [30, 42, 50, 58, 68, 76, 85, 94],
        description: "Provisioned multi-tenant cloud workspaces currently processing production traffic.",
        explanation: "Multi-tenant tenant clusters provisioned across production, staging, and dedicated enterprise VPCs.",
      },
      {
        title: "Customer Churn Rate",
        value: "1.2%",
        change: "-0.6%",
        isPositive: true,
        sparkline: [75, 68, 60, 52, 45, 38, 30, 24],
        description: "Monthly logo and subscription contraction churn rate across all tiers.",
        explanation: "Logo contraction decreased by 0.6% following dedicated SLA rollouts and proactive account health monitoring.",
      },
    ]
  }, [dateRange, formatCurrency, workspaceMultiplier])

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpiMetrics.map((kpi) => (
        <div
          key={kpi.title}
          className="flex flex-col justify-between rounded-xl border border-border/70 bg-card p-4 shadow-2xs transition-all hover:shadow-xs"
        >
          <div>
            {/* Card Top: Title with info icon */}
            <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 truncate">
                <Information className="size-3.5 shrink-0 text-muted-foreground/70" />
                <span className="truncate font-medium">{kpi.title}</span>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
                {dateRange === "Last 7 days" ? "7d" : dateRange === "Last 90 days" ? "90d" : dateRange === "Year to date" ? "YTD" : "30d"}
              </span>
            </div>

            {/* Card Middle: Big value, percentage pill, and mini bar sparkline */}
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="space-y-1">
                <div className="text-2xl font-bold tracking-tight text-foreground font-mono">
                  {kpi.value}
                </div>
                <div
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                    kpi.isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  )}
                >
                  {kpi.change}
                </div>
              </div>
              <MiniBarSparkline heights={kpi.sparkline} />
            </div>

            {/* Card Description */}
            <p className="mt-3 text-xs text-muted-foreground line-clamp-2">
              {kpi.description}
            </p>
          </div>

          {/* Operational Explanation Paragraph */}
          <div className="mt-3 border-t border-border/40 pt-2 text-[11px] leading-relaxed text-muted-foreground">
            <span className="font-semibold text-foreground">Operational Note: </span>
            {kpi.explanation}
          </div>
        </div>
      ))}
    </div>
  )
}

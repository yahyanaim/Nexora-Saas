"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { useAnalyticsFilter } from "./analytics-filter-context"

interface ProductRow {
  name: string
  revenue: string
  units: string
  progressPct: number
  iconEmoji: string
}

export function TopProductsCard() {
  const { dateRange, formatCurrency } = useAnalyticsFilter()

  const products: ProductRow[] = useMemo(() => {
    if (dateRange === "Last 7 days") {
      return [
        {
          name: "Enterprise Annual Commitment",
          revenue: formatCurrency(18200),
          units: "42 orgs",
          progressPct: 88,
          iconEmoji: "🏢",
        },
        {
          name: "Pro Team Workspaces",
          revenue: formatCurrency(14100),
          units: "310 teams",
          progressPct: 72,
          iconEmoji: "👥",
        },
        {
          name: "Nexora AI & Compute Engine",
          revenue: formatCurrency(5980),
          units: "420M tok",
          progressPct: 54,
          iconEmoji: "⚡",
        },
        {
          name: "Dedicated SOC 2 Compliance Pod",
          revenue: formatCurrency(2950),
          units: "18 pods",
          progressPct: 36,
          iconEmoji: "🛡️",
        },
      ]
    }

    if (dateRange === "Last 90 days") {
      return [
        {
          name: "Enterprise Annual Commitment",
          revenue: formatCurrency(222900),
          units: "42 orgs",
          progressPct: 88,
          iconEmoji: "🏢",
        },
        {
          name: "Pro Team Workspaces",
          revenue: formatCurrency(174600),
          units: "310 teams",
          progressPct: 72,
          iconEmoji: "👥",
        },
        {
          name: "Nexora AI & Compute Engine",
          revenue: formatCurrency(73500),
          units: "5.4B tok",
          progressPct: 54,
          iconEmoji: "⚡",
        },
        {
          name: "Dedicated SOC 2 Compliance Pod",
          revenue: formatCurrency(35760),
          units: "18 pods",
          progressPct: 36,
          iconEmoji: "🛡️",
        },
      ]
    }

    if (dateRange === "Last 1 year") {
      return [
        {
          name: "Enterprise Annual Commitment",
          revenue: formatCurrency(892000),
          units: "48 orgs",
          progressPct: 92,
          iconEmoji: "🏢",
        },
        {
          name: "Pro Team Workspaces",
          revenue: formatCurrency(615000),
          units: "410 teams",
          progressPct: 78,
          iconEmoji: "👥",
        },
        {
          name: "Nexora AI & Compute Engine",
          revenue: formatCurrency(284000),
          units: "21.8B tok",
          progressPct: 65,
          iconEmoji: "⚡",
        },
        {
          name: "Dedicated SOC 2 Compliance Pod",
          revenue: formatCurrency(142000),
          units: "24 pods",
          progressPct: 45,
          iconEmoji: "🛡️",
        },
      ]
    }

    if (dateRange === "Year to date") {
      return [
        {
          name: "Enterprise Annual Commitment",
          revenue: formatCurrency(745000),
          units: "45 orgs",
          progressPct: 90,
          iconEmoji: "🏢",
        },
        {
          name: "Pro Team Workspaces",
          revenue: formatCurrency(520000),
          units: "380 teams",
          progressPct: 75,
          iconEmoji: "👥",
        },
        {
          name: "Nexora AI & Compute Engine",
          revenue: formatCurrency(240000),
          units: "18.5B tok",
          progressPct: 60,
          iconEmoji: "⚡",
        },
        {
          name: "Dedicated SOC 2 Compliance Pod",
          revenue: formatCurrency(118000),
          units: "22 pods",
          progressPct: 40,
          iconEmoji: "🛡️",
        },
      ]
    }

    // Default: Last 30 days
    return [
      {
        name: "Enterprise Annual Commitment",
        revenue: formatCurrency(74300),
        units: "42 orgs",
        progressPct: 88,
        iconEmoji: "🏢",
      },
      {
        name: "Pro Team Workspaces",
        revenue: formatCurrency(58200),
        units: "310 teams",
        progressPct: 72,
        iconEmoji: "👥",
      },
      {
        name: "Nexora AI & Compute Engine",
        revenue: formatCurrency(24500),
        units: "1.8B tok",
        progressPct: 54,
        iconEmoji: "⚡",
      },
      {
        name: "Dedicated SOC 2 Compliance Pod",
        revenue: formatCurrency(11920),
        units: "18 pods",
        progressPct: 36,
        iconEmoji: "🛡️",
      },
    ]
  }, [dateRange, formatCurrency])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">Top Tiers & Cloud Add-ons</span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">{dateRange}</span>
        </div>

        {/* Product Rows */}
        <div className="space-y-4 pt-1">
          {products.map((prod) => (
            <div key={prod.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span>{prod.iconEmoji}</span>
                  <span className="truncate font-medium text-foreground">{prod.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 font-mono">
                  <span className="text-muted-foreground text-[11px]">{prod.units}</span>
                  <span className="font-semibold text-foreground">{prod.revenue}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                <div
                  className="h-full rounded-full bg-primary/80 transition-all duration-300"
                  style={{ width: `${prod.progressPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Catalog Performance: </span>
        Enterprise Annual commitments represent 44% of total volume with 88% quota attainment. AI compute token overages represent the fastest-growing velocity add-on.
      </div>
    </div>
  )
}

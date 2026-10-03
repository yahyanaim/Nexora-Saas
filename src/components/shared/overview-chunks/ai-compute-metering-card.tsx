"use client"

import { useMemo } from "react"
import { Information } from "@/components/ui/carbon/icons"
import { Cpu, Globe, Zap } from "lucide-react"
import { useAnalyticsFilter } from "./analytics-filter-context"

const EDGE_REGIONS = [
  { region: "US-East (N. Virginia)", latency: "28ms", uptime: "99.99%", status: "optimal" },
  { region: "EU-Central (Frankfurt)", latency: "34ms", uptime: "99.98%", status: "optimal" },
  { region: "AP-South (Singapore)", latency: "62ms", uptime: "99.95%", status: "optimal" },
]

export function AiComputeMeteringCard() {
  const { dateRange } = useAnalyticsFilter()

  const { tokenBurn, tokenUnit, cacheHit, cacheSaving, p99Latency, explanation } = useMemo(() => {
    if (dateRange === "Last 7 days") {
      return {
        tokenBurn: "420M",
        tokenUnit: "tokens / 7d",
        cacheHit: "85.8%",
        cacheSaving: "-19% token cost",
        p99Latency: "38ms",
        explanation:
          "Past 7-day compute telemetry: 420M tokens processed with 85.8% prompt prefix cache reuse, delivering sub-40ms P99 responses across all edge regions.",
      }
    }

    if (dateRange === "Last 90 days") {
      return {
        tokenBurn: "5.46B",
        tokenUnit: "tokens / 90d",
        cacheHit: "83.1%",
        cacheSaving: "-17% token cost",
        p99Latency: "44ms",
        explanation:
          "Quarterly compute telemetry: 5.46B tokens metered across enterprise workspaces with 83.1% shared prefix caching.",
      }
    }

    if (dateRange === "Last 1 year") {
      return {
        tokenBurn: "21.8B",
        tokenUnit: "tokens / yr",
        cacheHit: "84.5%",
        cacheSaving: "-19% token cost",
        p99Latency: "41ms",
        explanation:
          "Trailing 12-month compute telemetry: 21.8B tokens executed across global edge networks with 84.5% shared prefix prompt caching, saving an estimated $410k in raw LLM compute costs.",
      }
    }

    if (dateRange === "Year to date") {
      return {
        tokenBurn: "18.5B",
        tokenUnit: "tokens / YTD",
        cacheHit: "83.8%",
        cacheSaving: "-18% token cost",
        p99Latency: "42ms",
        explanation:
          "Year-to-date cumulative compute: 18.5B tokens processed globally with 99.99% edge gateway availability and sub-45ms global P99 latency.",
      }
    }

    // Default: Last 30 days
    return {
      tokenBurn: "1.82B",
      tokenUnit: "tokens / mo",
      cacheHit: "84.2%",
      cacheSaving: "-18% token cost",
      p99Latency: "42ms",
      explanation:
        "AI compute token metering tracks LLM token burn across all workspace members. Shared prefix caching achieves an 84.2% hit ratio, reducing raw model inference bills by 18%. Global edge gateways ensure sub-45ms responses worldwide.",
    }
  }, [dateRange])

  return (
    <div className="flex h-full flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-2xs">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Information className="size-3.5 text-muted-foreground/70" />
            <span className="font-medium">AI Compute & Edge Gateway Health</span>
            <span className="text-xs tabular-nums text-muted-foreground">({dateRange})</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success-foreground">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            Edge Clusters Normal
          </span>
        </div>

        {/* Compute & Token Metrics Grid */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Cpu className="size-3 text-primary" />
              <span>Token Burn</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              {tokenBurn}
            </p>
            <p className="text-xs text-muted-foreground">{tokenUnit}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Zap className="size-3 text-warning-foreground" />
              <span>Cache Hit</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              {cacheHit}
            </p>
            <p className="text-xs text-success-foreground">{cacheSaving}</p>
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="size-3 text-indigo-500" />
              <span>Median P99</span>
            </div>
            <p className="mt-1 text-base font-bold tabular-nums text-foreground">
              {p99Latency}
            </p>
            <p className="text-xs text-muted-foreground">global edge</p>
          </div>
        </div>

        {/* Regional Gateway Table */}
        <div className="mt-3 space-y-1.5">
          <p className="text-xs font-medium text-foreground/80">Regional Ingress Gateways</p>
          <div className="divide-y divide-border/40 text-xs">
            {EDGE_REGIONS.map((r) => (
              <div key={r.region} className="flex items-center justify-between py-1.5">
                <span className="text-foreground/90 font-normal">{r.region}</span>
                <div className="flex items-center gap-2 tabular-nums text-xs">
                  <span className="text-muted-foreground">{r.uptime}</span>
                  <span className="rounded-xs bg-success-soft px-1.5 py-0.5 text-xs font-semibold text-success-foreground">
                    {r.latency}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Explanation Paragraph */}
      <div className="mt-4 border-t border-border/40 pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Infrastructure Telemetry: </span>
        {explanation}
      </div>
    </div>
  )
}

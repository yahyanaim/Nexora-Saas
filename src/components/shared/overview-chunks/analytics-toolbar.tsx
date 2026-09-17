"use client"

import { useState } from "react"
import {
  ChartLineData,
  ChevronSort,
  Renew,
  SettingsAdjust,
  Checkmark,
} from "@/components/ui/carbon/icons"
import { Building2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

import {
  useAnalyticsFilter,
  DateRangeOption,
  CompareModeOption,
  CurrencyOption,
} from "./analytics-filter-context"

interface AnalyticsToolbarProps {
  onRefresh?: () => void
}

export function AnalyticsToolbar({ onRefresh }: AnalyticsToolbarProps) {
  const {
    dateRange,
    setDateRange,
    compareMode,
    setCompareMode,
    currency,
    setCurrency,
    workspace,
    setWorkspace,
    currencySymbol,
  } = useAnalyticsFilter()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh?.()
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success("Cloud analytics telemetry refreshed")
    }, 600)
  }

  const handleExportReport = () => {
    const reportData = `=====================================================
NEXORA SAAS — EXECUTIVE TELEMETRY & FINANCIAL REPORT
=====================================================
Generated: ${new Date().toUTCString()}
Environment Scope: ${workspace}
Currency Standard: ${currency}
Reporting Window: ${dateRange} (${compareMode})

1. KEY PERFORMANCE INDICATORS (KPIs)
-----------------------------------------------------
- Monthly Recurring Revenue (MRR): $168,920 (+24.8% net)
- Annual Recurring Revenue (ARR Run-Rate): $2,027,040
- Net Revenue Retention (NRR): 118.4% (+4.2%)
- Active Multi-Tenant Workspaces: 1,428 (+18.5%)
- Customer Churn Rate: 1.2% (-0.6% improvement)
- Average Revenue Per Account (ARPU): $1,180/mo

2. SUBSCRIPTION LEDGER BREAKDOWN
-----------------------------------------------------
- Enterprise Tier Subscriptions:  $94,500
- Pro Team Workspaces:            $48,200
- AI Compute & Token Overages:    $18,450
- Dedicated Cloud Pods & SLA:     $12,600
- Developer API Add-ons:          $6,820
- Expansion & Seat Upgrades:      $8,150
- Promotional Credits / Promo:   -$11,200
- Contractions & Churned Seats:   -$8,600
-----------------------------------------------------
NET MONTHLY RECURRING RUN-RATE:  $168,920

3. ENTERPRISE CLOUD & GATEWAY TELEMETRY
-----------------------------------------------------
- Global API Gateway Volume:      2.4M requests / hour
- Platform SLA Uptime:            99.99%
- Global Median P99 Latency:      42ms
- US-East (N. Virginia):          28ms (99.99% SLA)
- EU-Central (Frankfurt):         34ms (99.98% SLA)
- AP-South (Singapore):           62ms (99.95% SLA)
- Monthly AI Token Consumption:   1.82B tokens (84.2% cache hit)

4. EXECUTIVE SUMMARY & GUIDANCE
-----------------------------------------------------
Expansion pace remains sound. Enterprise Tier Annual commitments 
represent 44% of total billing volume with 88% quota attainment. 
Proactive retention monitoring recommended for accounts with >20% 
usage drops over consecutive 14-day rolling windows.
=====================================================
`
    const blob = new Blob([reportData], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `nexora-executive-analytics-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success("Executive SaaS telemetry report generated & downloaded")
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      {/* Title & Filter Pills */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Title */}
        <div className="flex items-center gap-2 mr-2">
          <ChartLineData className="size-5 text-foreground" />
          <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Cloud Analytics
          </h1>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Telemetry
          </span>
        </div>

        {/* Date Range Dropdown Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <span>{dateRange}</span>
              <ChevronSort className="size-3.5 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 text-xs">
            {(["Last 7 days", "Last 30 days", "Last 90 days", "Year to date"] as DateRangeOption[]).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  setDateRange(option)
                  toast.info(`Filtered for ${option}`)
                }}
                className="flex items-center justify-between text-xs"
              >
                <span>{option}</span>
                {dateRange === option && <Checkmark className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Compare Dropdown Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <span>{compareMode}</span>
              <ChevronSort className="size-3.5 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44 text-xs">
            {(
              dateRange === "Last 7 days"
                ? ["vs Prior 7d", "vs Same period 2025", "No comparison"]
                : dateRange === "Last 90 days"
                ? ["vs Prior 90d", "vs Same period 2025", "No comparison"]
                : dateRange === "Year to date"
                ? ["vs Prior period", "vs Same period 2025", "No comparison"]
                : ["vs Prior 30d", "vs Same period 2025", "No comparison"]
            ).map((option) => (
              <DropdownMenuItem
                key={option}
                onClick={() => {
                  setCompareMode(option as CompareModeOption)
                  toast.info(`Comparing ${option}`)
                }}
                className="flex items-center justify-between text-xs"
              >
                <span>{option}</span>
                {compareMode === option && <Checkmark className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Currency Dropdown Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <span className="font-semibold">{currencySymbol}</span>
              <span>{currency}</span>
              <ChevronSort className="size-3.5 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-32 text-xs">
            {[
              { code: "USD", symbol: "$" },
              { code: "EUR", symbol: "€" },
              { code: "GBP", symbol: "£" },
              { code: "JPY", symbol: "¥" },
              { code: "CAD", symbol: "CA$" },
            ].map((c) => (
              <DropdownMenuItem
                key={c.code}
                onClick={() => {
                  setCurrency(c.code as CurrencyOption)
                  toast.info(`Switched billing currency to ${c.code}`)
                }}
                className="flex items-center justify-between text-xs"
              >
                <span>{c.symbol} {c.code}</span>
                {currency === c.code && <Checkmark className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Workspaces Filter Pill */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-xs hover:bg-muted/40 transition-colors cursor-pointer select-none">
              <span>{workspace}</span>
              <ChevronSort className="size-3.5 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48 text-xs">
            {[
              "All Workspaces",
              "Acme Corp Prod",
              "Stark Industries",
              "Wayne Enterprises",
              "Cyberdyne Systems",
            ].map((ws) => (
              <DropdownMenuItem
                key={ws}
                onClick={() => {
                  setWorkspace(ws)
                  toast.info(`Scoped to workspace: ${ws}`)
                }}
                className="flex items-center justify-between text-xs"
              >
                <span>{ws}</span>
                {workspace === ws && <Checkmark className="size-3.5 text-primary" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Right Side Action Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toast.info("Active: 1,428 Multi-tenant Workspaces across 4 clusters")}
          className="h-8 gap-1.5 text-xs font-medium border-border/70"
        >
          <Building2 className="size-3.5 text-muted-foreground" />
          <span>Workspaces</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-8 gap-1.5 text-xs font-medium border-border/70"
        >
          <Renew
            className={`size-3.5 text-muted-foreground ${
              isRefreshing ? "animate-spin text-primary" : ""
            }`}
          />
          <span>Refresh</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={handleExportReport}
          className="h-8 gap-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 cursor-pointer"
        >
          <Download className="size-3 text-current" />
          <span>Save as report</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast.info("Configure visible SaaS KPI metrics")}
          className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <SettingsAdjust className="size-3.5" />
          <span className="hidden sm:inline">Manage Metrics</span>
        </Button>
      </div>
    </div>
  )
}

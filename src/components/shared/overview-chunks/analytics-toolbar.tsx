"use client"

import { useState } from "react"
import {
  ChartLineData,
  ChevronSort,
  Renew,
  SettingsAdjust,
  Checkmark,
} from "@/components/ui/carbon/icons"
import { Building2, Download, Eye, Printer, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

import {
  useAnalyticsFilter,
  DateRangeOption,
  CompareModeOption,
  CurrencyOption,
} from "./analytics-filter-context"

import {
  generateAnalyticsPdf,
  getAnalyticsReportHtml,
  printAnalyticsReport,
} from "@/lib/pdf/generate-analytics-pdf"

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
    currencyRate,
    workspaceMultiplier,
  } = useAnalyticsFilter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    onRefresh?.()
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success("Cloud analytics telemetry refreshed")
    }, 600)
  }

  const handleExportReport = async () => {
    try {
      await generateAnalyticsPdf({
        workspace,
        dateRange,
        compareMode,
        currency,
        currencySymbol,
        currencyRate,
        workspaceMultiplier,
      })
      toast.success("Executive 2-page board-deck report downloaded")
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate executive report")
    }
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
            {(["Last 7 days", "Last 30 days", "Last 90 days", "Last 1 year", "Year to date"] as DateRangeOption[]).map((option) => (
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
                : dateRange === "Last 1 year"
                ? ["vs Prior year", "vs Prior period", "No comparison"]
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="primary"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 cursor-pointer shadow-xs"
            >
              <Download className="size-3 text-current" />
              <span>Save as report</span>
              <ChevronSort className="size-3 opacity-60 ml-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 text-xs p-1">
            <DropdownMenuItem
              onClick={handleExportReport}
              className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md"
            >
              <Download className="size-3.5 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Download Executive PDF</span>
                <span className="text-[10px] text-muted-foreground">2-page board-deck with vector charts</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setPreviewOpen(true)}
              className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md"
            >
              <Eye className="size-3.5 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Preview Executive Brief</span>
                <span className="text-[10px] text-muted-foreground">Interactive on-screen report modal</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                printAnalyticsReport({
                  workspace,
                  dateRange,
                  compareMode,
                  currency,
                  currencySymbol,
                  currencyRate,
                  workspaceMultiplier,
                })
              }}
              className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md"
            >
              <Printer className="size-3.5 text-primary shrink-0" />
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Print Executive Brief</span>
                <span className="text-[10px] text-muted-foreground">Print-ready high-res document</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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

      {/* Interactive Executive Report Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[94vw] max-h-[90vh] p-5 flex flex-col gap-3">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/80 pb-3">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>Nexora Executive SaaS Intelligence & Telemetry Brief</span>
            </DialogTitle>
            <div className="flex items-center gap-2 mr-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  printAnalyticsReport({
                    workspace,
                    dateRange,
                    compareMode,
                    currency,
                    currencySymbol,
                    currencyRate,
                    workspaceMultiplier,
                  })
                }}
                className="h-7 text-xs gap-1.5"
              >
                <Printer className="size-3" />
                <span>Print</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportReport}
                className="h-7 text-xs gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                <Download className="size-3" />
                <span>Download PDF</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full overflow-hidden rounded-lg border border-border/70 bg-muted/10">
            <iframe
              srcDoc={getAnalyticsReportHtml({
                workspace,
                dateRange,
                compareMode,
                currency,
                currencySymbol,
                currencyRate,
                workspaceMultiplier,
              })}
              title="Executive Report Preview"
              className="w-full h-[66vh] border-0"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

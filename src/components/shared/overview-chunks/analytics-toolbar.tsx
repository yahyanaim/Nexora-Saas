"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { ChevronSort, Renew, Checkmark } from "@/components/ui/carbon/icons"
import { Download, Eye, Printer, FileText, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useRouter } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { exportToCsv } from "@/lib/utils/export-data"
import {
  downloadAnalyticsPdf,
  getAnalyticsReportHtml,
  printAnalyticsReport,
  type AnalyticsReportInput,
} from "@/lib/pdf/analytics-report"
import { PageHeader } from "@/components/shared/page-header"
import { Badge } from "@/components/ui/badge"
import { COMPARE_LABEL, COMPARE_MODES, DATE_RANGES, RANGE_LABEL, useAnalyticsFilter } from "./analytics-filter-context"

const PILL =
  "inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 text-[13px] font-medium text-foreground shadow-xs transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none"

export function AnalyticsToolbar() {
  const t = useTranslations()
  const locale = useLocale()
  const router = useRouter()
  const workspace = useCurrentWorkspace()
  const {
    dateRange,
    setDateRange,
    compareMode,
    setCompareMode,
    clientId,
    setClientId,
    departmentId,
    setDepartmentId,
    clients,
    departments,
    formatCurrency,
    formatBucket,
    analytics,
    refresh,
  } = useAnalyticsFilter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const clientName = clientId ? clients.find((c) => c.id === clientId)?.name : null
  const teamName = departmentId ? departments.find((d) => d.id === departmentId)?.name : null

  const report: AnalyticsReportInput = useMemo(
    () => ({
      analytics,
      title: t("anReportTitle"),
      subtitle: [t(RANGE_LABEL[dateRange]), t(COMPARE_LABEL[compareMode]), clientName ?? t("allClients"), teamName ?? t("allTeams")].join(" · "),
      company: workspace.name,
      generatedOn: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date()),
      money: (n) => formatCurrency(n),
      bucketLabel: (d) => formatBucket(d),
      labels: {
        revenue: t("anRevenueEarned"),
        margin: t("anGrossMargin"),
        utilization: t("anUtilization"),
        collected: t("anCashCollected"),
        profit: t("anGrossProfit"),
        laborCost: t("anLaborCost"),
        expenses: t("expenses"),
        billableHours: t("anBillableHours"),
        avgRate: t("anAvgRate"),
        openReceivables: t("openReceivables"),
        overdue: t("overdue"),
        revenueByPeriod: t("anRevenueByPeriod"),
        period: t("anPeriod"),
        hours: t("hours"),
        revenueByClient: t("anRevenueByClient"),
        client: t("client"),
        share: t("anShare"),
        change: t("anChange"),
        topProjects: t("anTopProjects"),
        project: t("project"),
        bridge: t("anRevenueBridge"),
        bridgeSteps: {
          start: t("anBridgeStart"),
          growth: t("anBridgeGrowth"),
          new: t("anBridgeNew"),
          decline: t("anBridgeDecline"),
          lost: t("anBridgeLost"),
          end: t("anBridgeEnd"),
        },
        clientsAtRisk: t("anClientsAtRisk"),
        none: t("anNothingToShow"),
      },
    }),
    [analytics, t, dateRange, compareMode, clientName, teamName, workspace.name, locale, formatCurrency, formatBucket]
  )

  const handleRefresh = () => {
    setIsRefreshing(true)
    refresh()
    setTimeout(() => {
      setIsRefreshing(false)
      toast.success(t("anRefreshed"))
    }, 600)
  }

  const handleExportReport = async () => {
    try {
      await downloadAnalyticsPdf(report, `analytics-${analytics.windows.current.from}-${analytics.windows.current.to}.pdf`)
      toast.success(t("anReportDownloaded"))
    } catch (err) {
      console.error(err)
      toast.error(t("anReportFailed"))
    }
  }

  const handleExportCsv = () => {
    exportToCsv(
      analytics.series.map((s) => ({
        period: s.from,
        revenue: s.revenue,
        laborCost: s.laborCost,
        expenses: s.expenses,
        profit: s.profit,
        collected: s.collected,
        billableHours: s.billableHours,
        hours: s.hours,
        utilization: s.utilization ?? "",
        avgRate: s.avgRate ?? "",
      })),
      "analytics",
      [
        { key: "period", label: t("anPeriod") },
        { key: "revenue", label: t("anRevenueEarned") },
        { key: "laborCost", label: t("anLaborCost") },
        { key: "expenses", label: t("expenses") },
        { key: "profit", label: t("anGrossProfit") },
        { key: "collected", label: t("anCashCollected") },
        { key: "billableHours", label: t("anBillableHours") },
        { key: "hours", label: t("hours") },
        { key: "utilization", label: t("anUtilization") },
        { key: "avgRate", label: t("anAvgRate") },
      ]
    )
  }

  return (
    <>
      <PageHeader
        title={t("anPageTitle")}
        badge={
          <Badge variant="success" className="hidden sm:inline-flex">
            <span className="size-1.5 rounded-full bg-success animate-pulse" />
            {t("anLiveData")}
          </Badge>
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/receivables")} className="max-xl:hidden">
              <Receipt className="text-muted-foreground" />
              <span>{t("receivables")}</span>
            </Button>

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <Renew className={`text-muted-foreground ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>{t("refresh")}</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="primary" size="sm">
                  <Download />
                  <span>{t("anSaveReport")}</span>
                  <ChevronSort className="opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuItem onClick={handleExportReport} className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md">
                  <Download className="size-3.5 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{t("anDownloadPdf")}</span>
                    <span className="text-xs text-muted-foreground">{t("anDownloadPdfHint")}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPreviewOpen(true)} className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md">
                  <Eye className="size-3.5 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{t("anPreviewReport")}</span>
                    <span className="text-xs text-muted-foreground">{t("anPreviewReportHint")}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => printAnalyticsReport(report)} className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md">
                  <Printer className="size-3.5 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{t("anPrintReport")}</span>
                    <span className="text-xs text-muted-foreground">{t("anPrintReportHint")}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCsv} className="flex items-center gap-2.5 p-2 cursor-pointer rounded-md">
                  <FileText className="size-3.5 text-primary shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{t("exportCsv")}</span>
                    <span className="text-xs text-muted-foreground">{t("anCsvHint")}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={PILL}>
                <span>{t(RANGE_LABEL[dateRange])}</span>
                <ChevronSort className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              {DATE_RANGES.map((option) => (
                <DropdownMenuItem key={option} onClick={() => setDateRange(option)} className="flex items-center justify-between">
                  <span>{t(RANGE_LABEL[option])}</span>
                  {dateRange === option && <Checkmark className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Comparison */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={PILL}>
                <span>{t(COMPARE_LABEL[compareMode])}</span>
                <ChevronSort className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {COMPARE_MODES.map((option) => (
                <DropdownMenuItem key={option} onClick={() => setCompareMode(option)} className="flex items-center justify-between">
                  <span>{t(COMPARE_LABEL[option])}</span>
                  {compareMode === option && <Checkmark className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Client */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={PILL}>
                <span>{clientName ?? t("allClients")}</span>
                <ChevronSort className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {[{ id: null as string | null, name: t("allClients") }, ...clients].map((c) => (
                <DropdownMenuItem key={c.id ?? "all"} onClick={() => setClientId(c.id)} className="flex items-center justify-between">
                  <span>{c.name}</span>
                  {clientId === c.id && <Checkmark className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Team */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className={PILL}>
                <span>{teamName ?? t("allTeams")}</span>
                <ChevronSort className="size-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {[{ id: null as string | null, name: t("allTeams") }, ...departments].map((d) => (
                <DropdownMenuItem key={d.id ?? "all"} onClick={() => setDepartmentId(d.id)} className="flex items-center justify-between">
                  <span>{d.name}</span>
                  {departmentId === d.id && <Checkmark className="size-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </PageHeader>

      {/* Report preview */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl w-[94vw] max-h-[90vh] p-5 flex flex-col gap-3">
          <DialogHeader className="flex flex-row items-center justify-between border-b border-border/80 pb-3">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <span>{t("anReportTitle")}</span>
            </DialogTitle>
            <div className="flex items-center gap-2 me-6">
              <Button variant="outline" size="sm" onClick={() => printAnalyticsReport(report)} className="h-7 text-xs gap-1.5">
                <Printer className="size-3" />
                <span>{t("print")}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExportReport}
                className="h-7 text-xs gap-1.5 bg-neutral-900 text-white hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900"
              >
                <Download className="size-3" />
                <span>{t("anDownloadPdf")}</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 w-full overflow-hidden rounded-lg border border-border/70 bg-muted/10">
            {previewOpen && (
              <iframe srcDoc={getAnalyticsReportHtml(report)} title={t("anReportTitle")} sandbox="" className="w-full h-[66vh] border-0" />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

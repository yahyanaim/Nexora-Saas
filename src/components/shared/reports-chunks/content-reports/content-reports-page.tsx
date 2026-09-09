// components/reports/content-reports-page.tsx

"use client"

import { useMemo, useState } from "react"
import { Tabs } from "@/components/ui/tabs"
import { getContentReportsColumns } from "./content-reports-columns"
import { ReportType, ReportStatus, ContentReport } from "@/types/reports"
import {
  Shield,
  User,
  FolderOpen,
  File,
  CreditCard,
  Receipt,
  Building,
} from "lucide-react"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useContentReportsTable } from "@/hooks/reports/use-content-reports-table"
import { useContentReportsStats } from "@/hooks/reports/use-content-reports-stats"
import { updateContentReportStatusApi } from "@/lib/api/reports-apis"
import { DataTable } from "../../data-table-chunks/data-table"
import { StatCard } from "@/components/ui/stat-card"
import { useTranslations } from "next-intl"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

type PendingAction = {
  type: "resolve" | "dismiss" | "review"
  report: ContentReport
} | null

export default function ContentReportsPage() {
  const t = useTranslations()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)

  const {
    items,
    pageCount,
    totalItems,
    isLoading,
    isFetching,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh,
  } = useContentReportsTable()

  const { stats, isLoading: isStatsLoading } = useContentReportsStats()
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: updateContentReportStatusApi,
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ["content-reports-stats"] })
      setPendingAction(null)
    },
  })

  const handleConfirm = () => {
    if (!pendingAction) return
    const { type, report } = pendingAction
    let status: ReportStatus
    if (type === "resolve") status = ReportStatus.RESOLVED
    else if (type === "dismiss") status = ReportStatus.DISMISSED
    else status = ReportStatus.REVIEWING

    statusMutation.mutate({ reportId: report.id, status })
  }

  const columns = useMemo(
    () =>
      getContentReportsColumns(
        {
          onResolve: (r) => setPendingAction({ type: "resolve", report: r }),
          onDismiss: (r) => setPendingAction({ type: "dismiss", report: r }),
          onReview: (r) => setPendingAction({ type: "review", report: r }),
        },
        t
      ),
    [t]
  )

  const handleTabChange = (reportType: ReportType | "all") => {
    setColumnFilters((prev) => {
      const withoutType = prev.filter((f) => f.id !== "targetType")
      if (reportType === "all") {
        return withoutType
      }
      return [...withoutType, { id: "targetType", value: [reportType] }]
    })
  }

  const tabs = [
    {
      id: "all",
      label: t("all"),
      icon: <Shield className="size-4" />,
      onClick: () => handleTabChange("all"),
    },
    {
      id: ReportType.USER,
      label: t("users"),
      icon: <User className="size-4" />,
      onClick: () => handleTabChange(ReportType.USER),
    },
    {
      id: ReportType.PROJECT,
      label: t("projects"),
      icon: <FolderOpen className="size-4" />,
      onClick: () => handleTabChange(ReportType.PROJECT),
    },
    {
      id: ReportType.FILE,
      label: t("files"),
      icon: <File className="size-4" />,
      onClick: () => handleTabChange(ReportType.FILE),
    },
    {
      id: ReportType.SUBSCRIPTION,
      label: t("subscriptions"),
      icon: <CreditCard className="size-4" />,
      onClick: () => handleTabChange(ReportType.SUBSCRIPTION),
    },
    {
      id: ReportType.TRANSACTION,
      label: t("transactions"),
      icon: <Building className="size-4" />,
      onClick: () => handleTabChange(ReportType.TRANSACTION),
    },
    {
      id: ReportType.INVOICE,
      label: t("invoices"),
      icon: <Receipt className="size-4" />,
      onClick: () => handleTabChange(ReportType.INVOICE),
    },
  ]

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const { type, report } = pendingAction
    switch (type) {
      case "resolve":
        return {
          title: t("resolveReportTitle"),
          description: t("resolveReportDescription", {
            name: report.targetName,
          }),
          confirmLabel: t("resolve"),
          destructive: false,
          isLoading: statusMutation.isPending,
        }
      case "dismiss":
        return {
          title: t("dismissReportTitle"),
          description: t("dismissReportDescription", {
            name: report.targetName,
          }),
          confirmLabel: t("dismiss"),
          destructive: true,
          isLoading: statusMutation.isPending,
        }
      case "review":
        return {
          title: t("reviewReportTitle"),
          description: t("reviewReportDescription", {
            name: report.targetName,
          }),
          confirmLabel: t("markReviewing"),
          destructive: false,
          isLoading: statusMutation.isPending,
        }
    }
  }, [pendingAction, statusMutation.isPending, t])

  const filterOptions = [
    { label: t("users"), value: ReportType.USER },
    { label: t("projects"), value: ReportType.PROJECT },
    { label: t("files"), value: ReportType.FILE },
    { label: t("subscriptions"), value: ReportType.SUBSCRIPTION },
    { label: t("transactions"), value: ReportType.TRANSACTION },
    { label: t("invoices"), value: ReportType.INVOICE },
  ]

  return (
    <>
      <DataTable
        manual
        title={t("contentReports")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={items}
        rowCount={totalItems}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("searchReports")}
        filters={[
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("pending"), value: ReportStatus.PENDING },
              { label: t("reviewing"), value: ReportStatus.REVIEWING },
              { label: t("resolved"), value: ReportStatus.RESOLVED },
              { label: t("dismissed"), value: ReportStatus.DISMISSED },
            ],
          },
          {
            columnId: "targetType",
            title: t("type"),
            options: filterOptions,
          },
        ]}
        renderAfterJsxToolbar={() => (
          <div className="space-y-2 px-2">
            <Tabs
              tabs={tabs}
              defaultTabId="all"
              instanceId="content-reports-tabs"
              containerClassName="bg-background"
            />
            <Carousel className="w-full">
              <CarouselContent>
                {[
                  {
                    key: "total",
                    label: t("total"),
                    value: stats?.total ?? 0,
                  },
                  {
                    key: "pending",
                    label: t("pending"),
                    value: stats?.pending ?? 0,
                  },
                  {
                    key: "reviewing",
                    label: t("reviewing"),
                    value: stats?.reviewing ?? 0,
                  },
                  {
                    key: "resolved",
                    label: t("resolved"),
                    value: stats?.resolved ?? 0,
                  },
                  {
                    key: "dismissed",
                    label: t("dismissed"),
                    value: stats?.dismissed ?? 0,
                  },
                ].map((stat) => (
                  <CarouselItem
                    key={stat.key}
                    className="basis-1/2 pl-2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5"
                  >
                    <div className="h-full">
                      <StatCard
                        label={stat.label}
                        value={stat.value}
                        isLoading={isStatsLoading}
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
          </div>
        )}
      />

      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </>
  )
}

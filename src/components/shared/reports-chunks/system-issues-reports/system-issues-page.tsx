"use client"
import { useMemo, useState } from "react"
import { Tabs } from "@/components/ui/tabs"
import { getSystemIssuesColumns } from "./system-issues-columns"
import { IssueStatus, SystemIssue } from "@/types/reports"
import { Shield, AlertCircle, Loader2, CheckCircle } from "@/components/ui/carbon/icons"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useSystemIssuesTable } from "@/hooks/reports/use-system-issues-table"
import { useSystemIssuesStats } from "@/hooks/reports/use-system-issues-stats"
import { updateSystemIssueStatusApi } from "@/lib/api/reports-apis"
import { DataTable } from "../../data-table-chunks/data-table"
import { StatCard } from "@/components/ui/stat-card"
import { useTranslations } from "next-intl"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel"

type PendingAction = {
  type: "resolve" | "close" | "progress"
  issue: SystemIssue
} | null

export default function SystemIssuesPage() {
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
  } = useSystemIssuesTable()

  const { stats, isLoading: isStatsLoading } = useSystemIssuesStats()
  const queryClient = useQueryClient()

  const statusMutation = useMutation({
    mutationFn: updateSystemIssueStatusApi,
    onSuccess: () => {
      refresh()
      queryClient.invalidateQueries({ queryKey: ["system-issues-stats"] })
      setPendingAction(null)
    },
  })

  const handleConfirm = () => {
    if (!pendingAction) return
    const { type, issue } = pendingAction
    let status: IssueStatus
    if (type === "resolve") status = IssueStatus.RESOLVED
    else if (type === "close") status = IssueStatus.CLOSED
    else status = IssueStatus.IN_PROGRESS

    statusMutation.mutate({ issueId: issue.id, status })
  }

  const columns = useMemo(
    () =>
      getSystemIssuesColumns(
        {
          onResolve: (i) => setPendingAction({ type: "resolve", issue: i }),
          onClose: (i) => setPendingAction({ type: "close", issue: i }),
          onProgress: (i) => setPendingAction({ type: "progress", issue: i }),
        },
        t
      ),
    [t]
  )

  const tabs = [
    {
      id: "all",
      label: t("all"),
      icon: <Shield className="size-4" />,
      onClick: () => {
        setColumnFilters((prev) => prev.filter((f) => f.id !== "status"))
      },
    },
    {
      id: IssueStatus.OPEN,
      label: t("open"),
      icon: <AlertCircle className="size-4" />,
      onClick: () => {
        setColumnFilters((prev) => {
          const withoutStatus = prev.filter((f) => f.id !== "status")
          return [...withoutStatus, { id: "status", value: [IssueStatus.OPEN] }]
        })
      },
    },
    {
      id: IssueStatus.IN_PROGRESS,
      label: t("inProgress"),
      icon: <Loader2 className="size-4" />,
      onClick: () => {
        setColumnFilters((prev) => {
          const withoutStatus = prev.filter((f) => f.id !== "status")
          return [
            ...withoutStatus,
            { id: "status", value: [IssueStatus.IN_PROGRESS] },
          ]
        })
      },
    },
    {
      id: IssueStatus.RESOLVED,
      label: t("resolved"),
      icon: <CheckCircle className="size-4" />,
      onClick: () => {
        setColumnFilters((prev) => {
          const withoutStatus = prev.filter((f) => f.id !== "status")
          return [
            ...withoutStatus,
            { id: "status", value: [IssueStatus.RESOLVED] },
          ]
        })
      },
    },
  ]

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const { type, issue } = pendingAction
    switch (type) {
      case "resolve":
        return {
          title: t("resolveIssueTitle"),
          description: t("resolveIssueDescription", { title: issue.title }),
          confirmLabel: t("resolve"),
          destructive: false,
          isLoading: statusMutation.isPending,
        }
      case "close":
        return {
          title: t("closeIssueTitle"),
          description: t("closeIssueDescription", { title: issue.title }),
          confirmLabel: t("close"),
          destructive: true,
          isLoading: statusMutation.isPending,
        }
      case "progress":
        return {
          title: t("startProgressTitle"),
          description: t("startProgressDescription", { title: issue.title }),
          confirmLabel: t("startProgress"),
          destructive: false,
          isLoading: statusMutation.isPending,
        }
    }
  }, [pendingAction, statusMutation.isPending, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DataTable
        manual
        title={t("systemIssues")}
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
        searchPlaceholder={t("searchIssues")}
        filters={[
          {
            columnId: "category",
            title: t("category"),
            options: [
              { label: t("calls"), value: "calls" },
              { label: t("media"), value: "media" },
              { label: t("messaging"), value: "messaging" },
              { label: t("application"), value: "application" },
              { label: t("account"), value: "account" },
              { label: t("notifications"), value: "notifications" },
              { label: t("other"), value: "other" },
            ],
          },
          {
            columnId: "priority",
            title: t("priority"),
            options: [
              { label: t("low"), value: "low" },
              { label: t("medium"), value: "medium" },
              { label: t("high"), value: "high" },
              { label: t("critical"), value: "critical" },
            ],
          },
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("open"), value: IssueStatus.OPEN },
              { label: t("inProgress"), value: IssueStatus.IN_PROGRESS },
              { label: t("resolved"), value: IssueStatus.RESOLVED },
              { label: t("closed"), value: IssueStatus.CLOSED },
            ],
          },
        ]}
        renderAfterJsxToolbar={() => (
          <div className="space-y-2 px-2">
            <Tabs
              tabs={tabs}
              defaultTabId="all"
              instanceId="system-issues-tabs"
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
                  { key: "open", label: t("open"), value: stats?.open ?? 0 },
                  {
                    key: "inProgress",
                    label: t("inProgress"),
                    value: stats?.inProgress ?? 0,
                  },
                  {
                    key: "resolved",
                    label: t("resolved"),
                    value: stats?.resolved ?? 0,
                  },
                  {
                    key: "closed",
                    label: t("closed"),
                    value: stats?.closed ?? 0,
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
    </div>
  )
}

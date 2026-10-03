"use client"
import { ColumnDef } from "@tanstack/react-table"
import { SystemIssue, IssueStatus, IssuePriority } from "@/types/reports"
import { formatDistanceToNow } from "date-fns"
import { ArrowUpCircle, CheckCircle, XCircle, AlertCircle } from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../../data-table-chunks/data-table-row-actions"

export interface SystemIssuesColumnActions {
  onResolve: (issue: SystemIssue) => void
  onClose: (issue: SystemIssue) => void
  onProgress: (issue: SystemIssue) => void
}

export function getSystemIssuesColumns(
  actions: SystemIssuesColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<SystemIssue>[] {
  const STATUS_CONFIG: Record<
    IssueStatus,
    { label: string; className: string }
  > = {
    [IssueStatus.OPEN]: {
      label: t("open"),
      className:
        "bg-warning-soft text-warning-foreground border-transparent",
    },
    [IssueStatus.IN_PROGRESS]: {
      label: t("inProgress"),
      className:
        "bg-info-soft text-info-foreground border-transparent",
    },
    [IssueStatus.RESOLVED]: {
      label: t("resolved"),
      className:
        "bg-success-soft text-success-foreground border-transparent",
    },
    [IssueStatus.CLOSED]: {
      label: t("closed"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
  }

  const PRIORITY_CONFIG: Record<
    IssuePriority,
    { label: string; color: string }
  > = {
    [IssuePriority.LOW]: { label: t("low"), color: "text-muted-foreground" },
    [IssuePriority.MEDIUM]: { label: t("medium"), color: "text-warning-foreground" },
    [IssuePriority.HIGH]: { label: t("high"), color: "text-warning-foreground" },
    [IssuePriority.CRITICAL]: {
      label: t("critical"),
      color: "text-destructive",
    },
  }

  return [
    {
      accessorKey: "title",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("title")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm font-medium">{row.original.title}</span>
      ),
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("category")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm capitalize">
          {t(row.original.category.toLowerCase())}
        </span>
      ),
    },
    {
      accessorKey: "priority",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("priority")} />
      ),
      cell: ({ row }) => {
        const p = row.original.priority
        return (
          <div className="flex items-center gap-1.5 text-sm">
            <ArrowUpCircle className={`size-4 ${PRIORITY_CONFIG[p].color}`} />
            <span className={PRIORITY_CONFIG[p].color}>
              {PRIORITY_CONFIG[p].label}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status")} />
      ),
      cell: ({ row }) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[row.original.status].className}`}
        >
          {STATUS_CONFIG[row.original.status].label}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("date")} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.createdAt), {
            addSuffix: true,
          })}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const issue = row.original
        const isOpen = issue.status === IssueStatus.OPEN
        const isInProgress = issue.status === IssueStatus.IN_PROGRESS

        const rowActions: RowAction<SystemIssue>[] = [
          ...(isOpen
            ? [
                {
                  label: t("startProgress"),
                  icon: AlertCircle,
                  onClick: actions.onProgress,
                },
              ]
            : []),
          ...(isOpen || isInProgress
            ? [
                {
                  label: t("resolve"),
                  icon: CheckCircle,
                  onClick: actions.onResolve,
                },
              ]
            : []),
          ...(isOpen || isInProgress
            ? [
                {
                  label: t("close"),
                  icon: XCircle,
                  variant: "destructive" as const,
                  separatorBefore: true,
                  onClick: actions.onClose,
                },
              ]
            : []),
        ]

        if (!rowActions.length) return null
        return <DataTableRowActions row={issue} actions={rowActions} />
      },
    },
  ]
}

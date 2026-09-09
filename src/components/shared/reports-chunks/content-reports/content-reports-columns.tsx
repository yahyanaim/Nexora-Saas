// components/reports/content-reports-columns.tsx

"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ContentReport, ReportStatus, ReportType } from "@/types/reports"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import {
  User,
  FolderOpen,
  File,
  CreditCard,
  Receipt,
  Shield,
  Building,
} from "lucide-react"
import { DataTableColumnHeader } from "../../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../../data-table-chunks/data-table-row-actions"

export interface ContentReportsColumnActions {
  onResolve: (report: ContentReport) => void
  onDismiss: (report: ContentReport) => void
  onReview: (report: ContentReport) => void
}

export function getContentReportsColumns(
  actions: ContentReportsColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<ContentReport>[] {
  const STATUS_CONFIG: Record<
    ReportStatus,
    { label: string; className: string }
  > = {
    [ReportStatus.PENDING]: {
      label: t("pending"),
      className:
        "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    },
    [ReportStatus.REVIEWING]: {
      label: t("reviewing"),
      className:
        "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    },
    [ReportStatus.RESOLVED]: {
      label: t("resolved"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [ReportStatus.DISMISSED]: {
      label: t("dismissed"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
  }

  const TYPE_ICON: Record<ReportType, React.ReactNode> = {
    [ReportType.USER]: <User className="size-4" />,
    [ReportType.PROJECT]: <FolderOpen className="size-4" />,
    [ReportType.FILE]: <File className="size-4" />,
    [ReportType.SUBSCRIPTION]: <CreditCard className="size-4" />,
    [ReportType.TRANSACTION]: <Building className="size-4" />,
    [ReportType.INVOICE]: <Receipt className="size-4" />,
  }

  const TYPE_LABEL: Record<ReportType, string> = {
    [ReportType.USER]: "user",
    [ReportType.PROJECT]: "project",
    [ReportType.FILE]: "file",
    [ReportType.SUBSCRIPTION]: "subscription",
    [ReportType.TRANSACTION]: "transaction",
    [ReportType.INVOICE]: "invoice",
  }

  return [
    {
      accessorKey: "reporterName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("reporter")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <SpaceAvatar
            name={row.original.reporterName}
            src={row.original.reporterAvatar}
            size="sm"
          />
          <span className="text-sm">{row.original.reporterName}</span>
        </div>
      ),
    },
    {
      accessorKey: "targetName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("target")} />
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <SpaceAvatar
            name={row.original.targetName}
            src={row.original.targetAvatar}
            size="sm"
          />
          <span className="text-sm">{row.original.targetName}</span>
        </div>
      ),
    },
    {
      accessorKey: "targetType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("type")} />
      ),
      cell: ({ row }) => {
        const type = row.original.targetType
        return (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {TYPE_ICON[type]}
            <span className="capitalize">{t(TYPE_LABEL[type])}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "reason",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("reason")} />
      ),
      cell: ({ row }) => {
        const reason = row.original.reason
        const reasonMap: Record<string, string> = {
          inappropriate_content: "inappropriateContent",
          spam: "spam",
          fraud: "fraud",
          copyright: "copyright",
          harassment: "harassment",
          impersonation: "impersonation",
          other: "other",
        }
        return (
          <span className="text-sm capitalize">
            {t(reasonMap[reason] || reason)}
          </span>
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
      id: "actions",
      cell: ({ row }) => {
        const r = row.original
        const isPending = r.status === ReportStatus.PENDING
        const isReviewing = r.status === ReportStatus.REVIEWING

        const rowActions: RowAction<ContentReport>[] = [
          ...(isPending
            ? [
                {
                  label: t("markReviewing"),
                  icon: Shield,
                  onClick: actions.onReview,
                },
              ]
            : []),
          ...(isPending || isReviewing
            ? [
                {
                  label: t("resolve"),
                  icon: Shield,
                  onClick: actions.onResolve,
                },
              ]
            : []),
          ...(isPending || isReviewing
            ? [
                {
                  label: t("dismiss"),
                  icon: Shield,
                  variant: "destructive" as const,
                  separatorBefore: true,
                  onClick: actions.onDismiss,
                },
              ]
            : []),
        ]

        if (!rowActions.length) return null
        return <DataTableRowActions row={r} actions={rowActions} />
      },
    },
  ]
}

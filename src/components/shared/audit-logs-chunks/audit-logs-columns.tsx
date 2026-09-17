"use client"

import { ColumnDef } from "@tanstack/react-table"
import { AuditLogEntry, AuditLogCategory, AuditLogStatus } from "@/lib/demo-data/audit-logs"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { formatDate } from "@/lib/utils/format-date"
import { Shield, CreditCard, UserFollow, Terminal, Activity, CheckCircle, Warning, Misuse, type LucideIcon } from "@/components/ui/carbon/icons"

const CATEGORY_CONFIG: Record<
  AuditLogCategory,
  { label: string; icon: LucideIcon; className: string }
> = {
  Security: {
    label: "Security",
    icon: Shield,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
  Billing: {
    label: "Billing",
    icon: CreditCard,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  Team: {
    label: "Team",
    icon: UserFollow,
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  API: {
    label: "API",
    icon: Terminal,
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  System: {
    label: "System",
    icon: Activity,
    className: "bg-muted text-muted-foreground border-border/50",
  },
}

const STATUS_CONFIG: Record<
  AuditLogStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  success: {
    label: "Success",
    icon: CheckCircle,
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  warning: {
    label: "Warning",
    icon: Warning,
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  error: {
    label: "Failed",
    icon: Misuse,
    className: "bg-destructive/10 text-destructive border-destructive/20",
  },
}

export function getAuditLogsColumns(
  t: (key: string) => string
): ColumnDef<AuditLogEntry>[] {
  return [
    {
      accessorKey: "actor",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("actor") || "Actor"} />
      ),
      cell: ({ row }) => {
        const actor = row.original.actor
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              src={actor.avatar}
              name={actor.name}
              size="sm"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-xs md:text-sm text-foreground truncate">
                {actor.name}
              </span>
              <span className="text-xs text-muted-foreground truncate">
                {actor.email}
              </span>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("category") || "Category"} />
      ),
      cell: ({ row }) => {
        const item = row.original
        const catConfig = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.System
        const CatIcon = catConfig.icon

        return (
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 h-5 gap-1 font-mono uppercase tracking-wider ${catConfig.className}`}
          >
            <CatIcon className="size-3" />
            {catConfig.label}
          </Badge>
        )
      },
      filterFn: (row, id, value) => {
        return Array.isArray(value) ? value.includes(row.getValue(id)) : true
      },
    },
    {
      accessorKey: "action",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("action") || "Action"} />
      ),
      cell: ({ row }) => {
        const item = row.original

        return (
          <span className="text-xs md:text-sm font-medium text-foreground">
            {item.action}
          </span>
        )
      },
    },
    {
      accessorKey: "targetResource",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("resource") || "Target Resource"} />
      ),
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex flex-col max-w-[280px]">
            <span className="text-xs font-mono font-medium text-foreground truncate">
              {item.targetResource}
            </span>
            {item.details && (
              <span className="text-[11px] text-muted-foreground truncate" title={item.details}>
                {item.details}
              </span>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "ipAddress",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("location") || "Client IP & Origin"} />
      ),
      cell: ({ row }) => {
        const item = row.original
        return (
          <div className="flex flex-col">
            <span className="text-xs font-mono text-foreground font-medium">
              {item.ipAddress}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {item.location}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status") || "Status"} />
      ),
      cell: ({ row }) => {
        const status = row.original.status
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.success
        const StatusIcon = config.icon

        return (
          <Badge
            variant="outline"
            className={`text-xs px-2 py-0.5 gap-1.5 ${config.className}`}
          >
            <StatusIcon className="size-3" />
            <span>{config.label}</span>
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("timestamp") || "Timestamp"} />
      ),
      cell: ({ row }) => {
        const dateStr = row.original.createdAt
        return (
          <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
            {formatDate(dateStr)}
          </span>
        )
      },
    },
  ]
}

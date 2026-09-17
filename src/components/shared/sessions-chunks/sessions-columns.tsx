"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Clock, Globe, Power, PowerOff, Trash2 } from "@/components/ui/carbon/icons"
import { formatDistanceToNow, format } from "date-fns"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../data-table-chunks/data-table-row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { Badge } from "@/components/ui/badge"
import { Session, SessionStatus } from "@/types/sessions"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { parseUserAgent } from "@/lib/utils/parse-user-agent"
import { formatLocation } from "@/lib/utils/format-location"
import { BrowserIcon } from "@/components/ui/browser-icon"
import { ar, enUS } from "date-fns/locale"

export interface SessionColumnActions {
  onActivate: (session: Session) => void
  onDeactivate: (session: Session) => void
  onDelete: (session: Session) => void
}

export function getSessionsColumns(
  actions: SessionColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: string
): ColumnDef<Session>[] {
  const dateLocale = locale === "ar" ? ar : enUS

  const STATUS_CONFIG: Record<
    SessionStatus,
    { label: string; className: string }
  > = {
    [SessionStatus.ACTIVE]: {
      label: t("active"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [SessionStatus.EXPIRED]: {
      label: t("inactive"),
      className:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
    },
    [SessionStatus.INACTIVE]: {
      label: t("inactive"),
      className:
        "bg-red-500/10 text-red-600 dark:text-red-400 border-transparent",
    },
  }

  return [
    {
      accessorKey: "user",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("user")} />
      ),
      cell: ({ row }) => {
        const user = row.original.user
        return (
          <div className="flex items-center gap-3">
            <SpaceAvatar
              name={user?.name ?? t("unknown")}
              src={user?.avatar}
              profileColor={user?.profileColor}
              size="sm"
            />
            <div>
              <p className="text-sm font-medium md:text-base">
                {user?.name ?? t("unknown")}
              </p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {user?.username ? `@${user?.username}` : (user?.email ?? "—")}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "userAgent",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("device")} />
      ),
      cell: ({ row }) => {
        const org = row.original
        const parsed = parseUserAgent(org.userAgent, t)
        const ua = org.userAgent
        const shortUa = ua?.length > 40 ? `${ua.slice(0, 40)}…` : ua
        return (
          <div className="flex items-center gap-2">
            <BrowserIcon
              deviceType={parsed.deviceType}
              browser={parsed.browserName}
              className="bg-transparent"
              classNameContainer="bg-transparent"
            />
            <span className="max-w-48 truncate" title={shortUa}>
              {shortUa ?? "—"}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "location",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("location")} />
      ),
      cell: ({ row }) => {
        const locationLabel = formatLocation(row.original.location)

        return (
          <div className="flex items-center gap-1.5">
            <Globe className="size-4" />
            <span>{locationLabel}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "ip",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("ipAddress")} />
      ),
      cell: ({ row }) => (
        <span className="font-medium tabular-nums">{row.original.ip}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("status")} />
      ),
      cell: ({ row }) => (
        <StatusBadge value={row.original.status} config={STATUS_CONFIG} />
      ),
    },
    {
      accessorKey: "lastUsedAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("lastUsed")} />
      ),
      cell: ({ row }) => {
        const lastUsedAt = row.original.lastUsedAt
        if (!lastUsedAt) return <span>—</span>
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="size-4" />
            <span>
              {formatDistanceToNow(new Date(lastUsedAt), {
                addSuffix: true,
                locale: dateLocale,
              })}
            </span>
          </div>
        )
      },
    },
    {
      accessorKey: "expiresIn",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("expires")} />
      ),
      cell: ({ row }) => {
        const expires = new Date(row?.original?.expiresIn?.toString() ?? "")
        const isExpired = expires < new Date()
        return (
          <Badge
            variant={isExpired ? "destructive" : "outline"}
            className="text-muted-foreground"
          >
            {format(expires, "MMM d, yyyy h:mm a", { locale: dateLocale })}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const session = row.original
        const isActive = session.status === SessionStatus.ACTIVE

        const rowActions: RowAction<Session>[] = isActive
          ? [
              {
                label: t("deactivate"),
                icon: PowerOff,
                variant: "destructive",
                onClick: actions.onDeactivate,
              },
              {
                label: t("deleteSession"),
                icon: Trash2,
                variant: "destructive",
                separatorBefore: true,
                onClick: actions.onDelete,
              },
            ]
          : [
              {
                label: t("activate"),
                icon: Power,
                onClick: actions.onActivate,
              },
              {
                label: t("deleteSession"),
                icon: Trash2,
                variant: "destructive",
                separatorBefore: true,
                onClick: actions.onDelete,
              },
            ]

        return <DataTableRowActions row={session} actions={rowActions} />
      },
    },
  ]
}

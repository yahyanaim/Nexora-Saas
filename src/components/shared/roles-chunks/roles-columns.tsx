"use client"

import { ColumnDef } from "@tanstack/react-table"
import { ShieldCheck, Pencil, Ban, CheckCircle2, Trash2 } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import {
  DataTableRowActions,
  RowAction,
} from "../data-table-chunks/data-table-row-actions"
import { Role } from "@/types/roles"
import { ActivationStatus } from "@/types/users"

export interface RolesColumnActions {
  onEdit: (role: Role) => void
  onDeactivate: (role: Role) => void
  onActivate: (role: Role) => void
  onDelete: (role: Role) => void
}

export function getRolesColumns(
  actions: RolesColumnActions,
  t: (key: string, values?: Record<string, string | number>) => string
): ColumnDef<Role>[] {
  const STATUS_CONFIG: Record<
    ActivationStatus,
    { label: string; className: string }
  > = {
    [ActivationStatus.ACTIVE]: {
      label: t("active"),
      className:
        "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    },
    [ActivationStatus.INACTIVE]: {
      label: t("inactive"),
      className: "bg-muted text-muted-foreground border-transparent",
    },
  }

  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("role")} />
      ),
      cell: ({ row }) => {
        const role = row.original
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-medium md:text-base">{role.name}</p>
              <p className="text-xs text-muted-foreground md:text-sm">
                {t("permissionsCount", {
                  count: role.permissions?.length ?? 0,
                })}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: "permissions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("permissions")} />
      ),
      cell: ({ row }) => {
        const permissions = row.original.permissions ?? []
        const visible = permissions.slice(0, 3)
        const remaining = permissions.length - visible.length

        return (
          <div className="flex max-w-xs flex-wrap items-center gap-1.5">
            {visible.map((p) => (
              <Badge key={p} variant="secondary" className="font-normal">
                {p}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge variant="outline" className="font-normal">
                +{remaining}
              </Badge>
            )}
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
        <StatusBadge value={row.original.status} config={STATUS_CONFIG} />
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original
        const isActive = role.status === ActivationStatus.ACTIVE

        const rowActions: RowAction<Role>[] = isActive
          ? [
              { label: t("edit"), icon: Pencil, onClick: actions.onEdit },
              {
                label: t("deactivate"),
                icon: Ban,
                variant: "destructive",
                separatorBefore: true,
                onClick: actions.onDeactivate,
              },
              {
                label: t("deleteRole"),
                icon: Trash2,
                variant: "destructive",
                onClick: actions.onDelete,
              },
            ]
          : [
              { label: t("edit"), icon: Pencil, onClick: actions.onEdit },
              {
                label: t("activate"),
                icon: CheckCircle2,
                separatorBefore: true,
                onClick: actions.onActivate,
              },
              {
                label: t("deleteRole"),
                icon: Trash2,
                variant: "destructive",
                onClick: actions.onDelete,
              },
            ]

        return <DataTableRowActions row={role} actions={rowActions} />
      },
    },
  ]
}

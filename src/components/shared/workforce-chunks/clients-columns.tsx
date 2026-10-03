"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Eye, Pencil, Trash2 } from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableRowActions } from "../data-table-chunks/data-table-row-actions"
import type { Client, Employee } from "@/types/workforce"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, formatMoney, includesFilter } from "./workforce-labels"

interface Options {
  t: (key: string, values?: Record<string, string | number>) => string
  employees: Employee[]
  currency: string
  canEdit: boolean
  canDelete: boolean
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export function getClientsColumns({
  t,
  employees,
  currency,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: Options): ColumnDef<Client>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("client")} />,
      filterFn: (row, _id, value: string) => {
        const q = String(value ?? "").toLowerCase()
        const c = row.original
        return [c.name, c.email, c.industry ?? "", ...c.contacts.map((x) => x.name)].some((field) =>
          field.toLowerCase().includes(q)
        )
      },
      cell: ({ row }) => {
        const c = row.original
        return (
          <button
            type="button"
            onClick={() => onView(c)}
            className="flex items-center gap-3 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <SpaceAvatar name={c.name} size="md" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{c.name}</span>
              <span className="truncate text-xs text-muted-foreground">{c.industry || c.email}</span>
            </span>
          </button>
        )
      },
    },
    {
      id: "primaryContact",
      header: () => <span>{t("primaryContact")}</span>,
      cell: ({ row }) => {
        const primary = row.original.contacts.find((c) => c.isPrimary)
        return primary ? (
          <span className="flex flex-col text-sm">
            <span>{primary.name}</span>
            <span className="text-xs text-muted-foreground">{primary.position || primary.email}</span>
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )
      },
    },
    {
      id: "accountManager",
      header: () => <span>{t("accountManager")}</span>,
      cell: ({ row }) => (
        <span className="text-sm">
          {employees.find((e) => e.id === row.original.accountManagerId)?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "hourlyRate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("rate")} />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.hourlyRate ? `${formatMoney(row.original.hourlyRate, currency)}/h` : t("standardRates")}
        </span>
      ),
    },
    {
      accessorKey: "paymentTermsDays",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("paymentTerms")} />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">{t("netDays", { days: row.original.paymentTermsDays })}</span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
      filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
      cell: ({ row }) => (
        <Badge variant="outline" className={CLIENT_STATUS_CLASS[row.original.status]}>
          {t(CLIENT_STATUS_LABEL[row.original.status])}
        </Badge>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DataTableRowActions
          row={row.original}
          actions={[
            { label: t("view"), icon: Eye, onClick: onView },
            ...(canEdit ? [{ label: t("edit"), icon: Pencil, onClick: onEdit }] : []),
            ...(canDelete
              ? [{ label: t("delete"), icon: Trash2, onClick: onDelete, variant: "destructive" as const, separatorBefore: true }]
              : []),
          ]}
        />
      ),
    },
  ]
}

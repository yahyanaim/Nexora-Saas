"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Eye, Pencil, Trash2 } from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableRowActions } from "../data-table-chunks/data-table-row-actions"
import type { Department, Employee } from "@/types/workforce"
import {
  EMPLOYEE_STATUS_CLASS,
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  WORK_ROLE_LABEL,
  formatMoney,
  includesFilter,
} from "./workforce-labels"

interface Options {
  t: (key: string) => string
  departments: Department[]
  currency: string
  canEdit: boolean
  canDelete: boolean
  onView: (employee: Employee) => void
  onEdit: (employee: Employee) => void
  onDelete: (employee: Employee) => void
}

export function getEmployeesColumns({
  t,
  departments,
  currency,
  canEdit,
  canDelete,
  onView,
  onEdit,
  onDelete,
}: Options): ColumnDef<Employee>[] {
  const departmentName = (id?: string) => departments.find((d) => d.id === id)?.name ?? "—"

  return [
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("employee")} />,
      // Search matches name, email and job title
      filterFn: (row, _id, value: string) => {
        const q = String(value ?? "").toLowerCase()
        const e = row.original
        return [e.name, e.email, e.jobTitle].some((field) => field.toLowerCase().includes(q))
      },
      cell: ({ row }) => {
        const e = row.original
        return (
          <button
            type="button"
            onClick={() => onView(e)}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg"
          >
            <SpaceAvatar name={e.name} size="md" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{e.name}</span>
              <span className="truncate text-xs text-muted-foreground">{e.jobTitle}</span>
            </span>
          </button>
        )
      },
    },
    {
      id: "department",
      accessorFn: (e) => e.departmentId ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("department")} />,
      filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
      cell: ({ row }) => <span className="text-sm">{departmentName(row.original.departmentId)}</span>,
    },
    {
      accessorKey: "role",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("accessRole")} />,
      filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
      cell: ({ row }) => (
        <Badge variant="outline" className="font-normal">
          {t(WORK_ROLE_LABEL[row.original.role])}
        </Badge>
      ),
    },
    {
      accessorKey: "employmentType",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("employmentType")} />,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {t(EMPLOYMENT_TYPE_LABEL[row.original.employmentType])}
        </span>
      ),
    },
    {
      accessorKey: "billableRate",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("billableRate")} />,
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.billableRate > 0 ? `${formatMoney(row.original.billableRate, currency)}/h` : "—"}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
      filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
      cell: ({ row }) => (
        <Badge variant="outline" className={EMPLOYEE_STATUS_CLASS[row.original.status]}>
          {t(EMPLOYEE_STATUS_LABEL[row.original.status])}
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
              ? [
                  {
                    label: t("delete"),
                    icon: Trash2,
                    onClick: onDelete,
                    variant: "destructive" as const,
                    separatorBefore: true,
                  },
                ]
              : []),
          ]}
        />
      ),
    },
  ]
}

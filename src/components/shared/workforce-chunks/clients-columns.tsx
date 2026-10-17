"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Eye, Pencil, Trash2 } from "@/components/ui/carbon/icons"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableRowActions } from "../data-table-chunks/data-table-row-actions"
import type { ClientFigures, HealthLevel } from "@/lib/workforce/client-figures"
import { cn } from "@/lib/utils"
import type { Client, Employee } from "@/types/workforce"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, formatMoney, includesFilter } from "./workforce-labels"

export const HEALTH_CLASS: Record<HealthLevel, string> = {
  good: "bg-success",
  watch: "bg-warning",
  at_risk: "bg-destructive",
}

interface Options {
  t: (key: string, values?: Record<string, string | number>) => string
  locale: string
  employees: Employee[]
  currency: string
  figures: Map<string, ClientFigures>
  /** Amounts are shown only to people allowed to read invoices */
  canSeeMoney: boolean
  canSelect: boolean
  canEdit: boolean
  canDelete: boolean
  onView: (client: Client) => void
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

/** "3 days ago", "last month"… in the reader's language. */
export function relativeDay(iso: string, today: string, locale: string) {
  const days = Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (Math.abs(days) < 7) return rtf.format(days, "day")
  if (Math.abs(days) < 45) return rtf.format(Math.round(days / 7), "week")
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), "month")
  return rtf.format(Math.round(days / 365), "year")
}

const primary = (c: Client) => c.contacts.find((x) => x.isPrimary)

/**
 * The CRM clients list (CRM step 2): who the client is, how to reach them,
 * how much work and money is open, and when someone last spoke to them.
 * Hidden columns carry the filters (account manager, industry, tags, source, health).
 */
export function getClientsColumns(o: Options): ColumnDef<Client>[] {
  const { t, figures } = o
  const today = new Date().toISOString().slice(0, 10)
  const fig = (c: Client) => figures.get(c.id)
  const anyOf = (values: string[], selected: unknown) => !Array.isArray(selected) || selected.length === 0 || values.some((v) => selected.includes(v))

  const columns: ColumnDef<Client>[] = [
    ...(o.canSelect
      ? [
          {
            id: "select",
            enableSorting: false,
            enableHiding: false,
            header: ({ table }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
                aria-label={t("clSelectAll")}
              />
            ),
            cell: ({ row }) => (
              <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label={t("clSelect", { name: row.original.name })} />
            ),
          } satisfies ColumnDef<Client>,
        ]
      : []),
    {
      accessorKey: "name",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("client")} />,
      filterFn: (row, _id, value: string) => {
        const q = String(value ?? "").trim().toLowerCase()
        const c = row.original
        return !q || [c.name, c.legalName ?? "", c.email, c.phone ?? "", c.industry ?? "", ...(c.tags ?? []), ...c.contacts.flatMap((x) => [x.name, x.email])].some((f) => f.toLowerCase().includes(q))
      },
      cell: ({ row }) => {
        const c = row.original
        const health = fig(c)?.health
        return (
          <button type="button" onClick={() => o.onView(c)} className="flex items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <span className="relative">
              <SpaceAvatar name={c.name} size="md" />
              {health && (
                <span className={cn("absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full ring-2 ring-card", HEALTH_CLASS[health.level])} title={[t(`clHealth_${health.level}`), ...health.reasons.map((r) => t(`clReason_${r}`))].join(" · ")} aria-hidden />
              )}
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium text-foreground">{c.name}</span>
              <span className="truncate text-xs text-muted-foreground">{primary(c)?.name ?? c.industry ?? "—"}</span>
            </span>
          </button>
        )
      },
    },
    {
      id: "email",
      accessorFn: (c) => primary(c)?.email || c.email,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("email")} />,
      cell: ({ getValue }) => {
        const email = String(getValue() ?? "")
        return email ? <a href={`mailto:${email}`} className="text-sm text-muted-foreground hover:text-foreground hover:underline">{email}</a> : <span className="text-sm text-muted-foreground">—</span>
      },
    },
    {
      id: "phone",
      accessorFn: (c) => primary(c)?.phone || c.phone || "",
      header: () => <span>{t("phone")}</span>,
      enableSorting: false,
      cell: ({ getValue }) => {
        const phone = String(getValue() ?? "")
        return phone ? <a href={`tel:${phone.replace(/\s/g, "")}`} className="text-sm tabular-nums text-muted-foreground hover:text-foreground" dir="ltr">{phone}</a> : <span className="text-sm text-muted-foreground">—</span>
      },
    },
    {
      id: "projects",
      accessorFn: (c) => fig(c)?.projects.total ?? 0,
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("projects")} />,
      cell: ({ row, getValue }) => {
        const p = fig(row.original)?.projects
        return (
          <span className="text-sm tabular-nums" title={p ? t("clProjectsTip", { active: p.inProgress, done: p.completed }) : undefined}>
            <span className="font-medium">{String(getValue())}</span>
            {p && p.inProgress > 0 && <span className="ms-1.5 text-xs text-muted-foreground">({t("clInProgressShort", { n: p.inProgress })})</span>}
          </span>
        )
      },
    },
    ...(o.canSeeMoney
      ? [
          {
            id: "owed",
            accessorFn: (c) => fig(c)?.outstanding ?? 0,
            header: ({ column }) => <DataTableColumnHeader column={column} title={t("clOwed")} />,
            cell: ({ row }) => {
              const f = fig(row.original)
              if (!f || f.outstanding === 0) return <span className="text-sm text-muted-foreground">—</span>
              return (
                <span className="flex flex-col text-sm tabular-nums">
                  <span className="font-medium">{formatMoney(f.outstanding, o.currency, o.locale)}</span>
                  {f.overdue > 0 && <span className="text-xs text-destructive">{t("clLateBy", { days: f.oldestLateDays })}</span>}
                </span>
              )
            },
          } satisfies ColumnDef<Client>,
        ]
      : []),
    {
      id: "lastContact",
      accessorFn: (c) => fig(c)?.lastContact ?? "",
      header: ({ column }) => <DataTableColumnHeader column={column} title={t("clLastContact")} />,
      cell: ({ row }) => {
        const f = fig(row.original)
        const next = f?.nextFollowUp
        return (
          <span className="flex flex-col text-sm">
            <span>{f?.lastContact ? <span title={f.lastContact}>{relativeDay(f.lastContact, today, o.locale)}</span> : <span className="text-muted-foreground">{t("clNever")}</span>}</span>
            {next && (
              <span className={cn("text-xs", next.dueDate < today ? "text-destructive" : "text-muted-foreground")}>
                {t("clNextShort", { when: relativeDay(next.dueDate, today, o.locale) })}
              </span>
            )}
          </span>
        )
      },
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
    // filters only (hidden): account manager, industry, tags, lead source, health
    { id: "manager", accessorFn: (c) => c.accountManagerId ?? "", filterFn: (row, id, v) => includesFilter(row.getValue(id), v), enableHiding: false },
    { id: "industry", accessorFn: (c) => c.industry ?? "", filterFn: (row, id, v) => includesFilter(row.getValue(id), v), enableHiding: false },
    { id: "tags", accessorFn: (c) => (c.tags ?? []).join(", "), filterFn: (row, _id, v) => anyOf(row.original.tags ?? [], v), enableHiding: false },
    { id: "leadSource", accessorFn: (c) => c.leadSource ?? "", filterFn: (row, id, v) => includesFilter(row.getValue(id), v), enableHiding: false },
    { id: "health", accessorFn: (c) => fig(c)?.health?.level ?? "", filterFn: (row, id, v) => includesFilter(row.getValue(id), v), enableHiding: false },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DataTableRowActions
          row={row.original}
          actions={[
            { label: t("view"), icon: Eye, onClick: o.onView },
            ...(o.canEdit ? [{ label: t("edit"), icon: Pencil, onClick: o.onEdit }] : []),
            ...(o.canDelete ? [{ label: t("delete"), icon: Trash2, onClick: o.onDelete, variant: "destructive" as const, separatorBefore: true }] : []),
          ]}
        />
      ),
    },
  ]
  return columns
}

/** The hidden filter columns, for the table's starting visibility. */
export const CLIENT_FILTER_COLUMNS = { manager: false, industry: false, tags: false, leadSource: false, health: false }

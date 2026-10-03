"use client"

import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { DollarSign, Receipt, TrendingDown, TrendingUp } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { projectProfit } from "@/lib/workforce/profitability"
import { WorkProjectStatus, type WorkProject } from "@/types/work-projects"
import type { ProjectProfit } from "@/types/work-costs"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { BUDGET_TYPE_LABEL } from "../work-projects-chunks/project-labels"

type Row = WorkProject & { profit: ProjectProfit }

/** Margin wording and colour; the number is always shown next to it. */
function marginClass(margin: number | null) {
  if (margin === null) return "bg-muted text-muted-foreground border-transparent"
  if (margin < 0) return "bg-danger-soft text-destructive border-transparent"
  if (margin < 25) return "bg-warning-soft text-warning-foreground border-transparent"
  return "bg-success-soft text-success-foreground border-transparent"
}

export default function ProfitabilityPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { data: projects = [], isLoading } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: entries = [] } = useTimeEntries()
  const { data: expenses = [] } = useExpenses()
  const { data: employees = [] } = useEmployees()
  const { data: clients = [] } = useClients()

  const rows = useMemo<Row[]>(
    () =>
      projects
        .filter((p) => p.status !== WorkProjectStatus.CANCELLED)
        .map((p) => ({ ...p, profit: projectProfit(p, { entries, tasks, expenses, employees, clients }) })),
    [projects, entries, tasks, expenses, employees, clients]
  )

  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const total = rows.reduce(
    (acc, r) => ({
      revenue: acc.revenue + r.profit.revenue,
      labor: acc.labor + r.profit.laborCost,
      expenses: acc.expenses + r.profit.expenses,
      profit: acc.profit + r.profit.profit,
    }),
    { revenue: 0, labor: 0, expenses: 0, profit: 0 }
  )
  const margin = total.revenue > 0 ? Math.round((total.profit / total.revenue) * 100) : null

  const cards: MetricCardItem[] = [
    { key: "revenue", title: t("revenueEarned"), value: money(total.revenue), valueClassName: "text-primary", footer: { icon: DollarSign, text: t("revenueRule") } },
    { key: "labor", title: t("laborCost"), value: money(total.labor), footer: { icon: TrendingDown, text: t("hoursTimesCost") } },
    { key: "expenses", title: t("expenses"), value: money(total.expenses), footer: { icon: Receipt, text: t("approvedExpenses") } },
    {
      key: "profit",
      title: t("profit"),
      value: money(total.profit),
      valueClassName: total.profit < 0 ? "text-destructive" : "text-success-foreground",
      footer: { icon: TrendingUp, text: margin === null ? t("noRevenueYet") : t("marginIs", { margin }) },
    },
  ]

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("project")} />,
        filterFn: (row, _id, value: string) => {
          const q = String(value ?? "").toLowerCase()
          return [row.original.name, row.original.code, clients.find((c) => c.id === row.original.clientId)?.name ?? ""].some((s) => s.toLowerCase().includes(q))
        },
        cell: ({ row }) => (
          <Link href={`/dashboard/projects/${row.original.id}`} className="flex min-w-0 flex-col hover:text-primary">
            <span className="truncate text-sm font-medium">{row.original.name}</span>
            <span className="truncate text-xs text-muted-foreground">
              {row.original.code} · {clients.find((c) => c.id === row.original.clientId)?.name ?? t("internalProject")} · {t(BUDGET_TYPE_LABEL[row.original.budgetType])}
            </span>
          </Link>
        ),
      },
      {
        id: "revenue",
        accessorFn: (r) => r.profit.revenue,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("revenue")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatMoney(row.original.profit.revenue, workspace.currency, locale)}</span>,
      },
      {
        id: "labor",
        accessorFn: (r) => r.profit.laborCost,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("laborCost")} />,
        cell: ({ row }) => (
          <span className="flex flex-col text-sm tabular-nums">
            {formatMoney(row.original.profit.laborCost, workspace.currency, locale)}
            <span className="text-xs text-muted-foreground">{row.original.profit.hours} h</span>
          </span>
        ),
      },
      {
        id: "expenses",
        accessorFn: (r) => r.profit.expenses,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("expenses")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatMoney(row.original.profit.expenses, workspace.currency, locale)}</span>,
      },
      {
        id: "profit",
        accessorFn: (r) => r.profit.profit,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("profit")} />,
        cell: ({ row }) => (
          <span className={cn("text-sm font-semibold tabular-nums", row.original.profit.profit < 0 && "text-destructive")}>
            {formatMoney(row.original.profit.profit, workspace.currency, locale)}
          </span>
        ),
      },
      {
        id: "margin",
        accessorFn: (r) => r.profit.margin ?? -Infinity,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("margin")} />,
        cell: ({ row }) => (
          <Badge variant="outline" className={marginClass(row.original.profit.margin)}>
            {row.original.profit.margin === null ? t("noRevenue") : `${row.original.profit.margin}%`}
          </Badge>
        ),
      },
    ],
    [t, locale, clients, workspace.currency]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="text-base font-semibold">{t("profitByProject")}</h2>
        <ul className="flex flex-col gap-3">
          {[...rows].sort((a, b) => b.profit.revenue - a.profit.revenue).map((r) => {
            const max = Math.max(1, ...rows.map((x) => Math.max(x.profit.revenue, x.profit.laborCost + x.profit.expenses)))
            const cost = r.profit.laborCost + r.profit.expenses
            return (
              <li key={r.id} className="grid grid-cols-[10rem_1fr_6rem] items-center gap-3 text-sm md:grid-cols-[14rem_1fr_7rem]">
                <span className="truncate font-medium">{r.name}</span>
                <span className="flex flex-col gap-1" aria-label={`${t("revenue")} ${money(r.profit.revenue)}, ${t("cost")} ${money(cost)}`}>
                  <span className="h-2.5 rounded-full bg-primary" style={{ width: `${(r.profit.revenue / max) * 100}%` }} />
                  <span className="h-2.5 rounded-full bg-muted-foreground/40" style={{ width: `${(cost / max) * 100}%` }} />
                </span>
                <span className={cn("text-right font-semibold tabular-nums", r.profit.profit < 0 && "text-destructive")}>{money(r.profit.profit)}</span>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-full bg-primary" aria-hidden />{t("revenue")}</span>
          <span className="flex items-center gap-2"><span className="h-2 w-4 rounded-full bg-muted-foreground/40" aria-hidden />{t("costLaborExpenses")}</span>
        </div>
      </section>

      <DataTable
        title={t("projects")}
        isLoading={isLoading}
        columns={columns}
        data={rows}
        searchColumnId="name"
        searchPlaceholder={t("searchProjects")}
        exportFilename="profitability"
        getExportData={() =>
          rows.map((r) => ({
            project: r.name,
            code: r.code,
            revenue: r.profit.revenue,
            laborCost: r.profit.laborCost,
            hours: r.profit.hours,
            expenses: r.profit.expenses,
            profit: r.profit.profit,
            margin: r.profit.margin ?? "",
          }))
        }
      />
    </div>
  )
}

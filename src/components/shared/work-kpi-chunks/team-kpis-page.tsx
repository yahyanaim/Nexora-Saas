"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { CheckCircle, Clock, DollarSign, Gauge } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { UTILIZATION_TARGET, employeeKpis, periodRange, teamKpis, type EmployeeKpis, type KpiPeriod } from "@/lib/workforce/kpis"
import { isTaskOverdue } from "@/lib/workforce/project-metrics"
import { EmployeeStatus, type Employee } from "@/types/workforce"
import { TaskStatus } from "@/types/work-projects"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"

type Row = EmployeeKpis & { employee: Employee }

/** Utilization against the target; the number is always printed. */
function utilizationClass(value: number | null) {
  if (value === null) return "bg-muted text-muted-foreground border-transparent"
  if (value > 110) return "bg-danger-soft text-destructive border-transparent"
  if (value >= UTILIZATION_TARGET) return "bg-success-soft text-success-foreground border-transparent"
  if (value >= 50) return "bg-warning-soft text-warning-foreground border-transparent"
  return "bg-muted text-muted-foreground border-transparent"
}

export default function TeamKpisPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: entries = [] } = useTimeEntries()
  const { data: tasks = [] } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: clients = [] } = useClients()
  const { data: leave = [] } = useLeave()

  const [period, setPeriod] = useState<KpiPeriod>("30d")
  const [selected, setSelected] = useState<Row | null>(null)
  const { from, to } = periodRange(period)

  const rows = useMemo<Row[]>(
    () =>
      employees
        .filter((e) => e.status !== EmployeeStatus.INACTIVE && e.billableRate > 0)
        .map((employee) => ({ ...employeeKpis(employee, { entries, tasks, projects, clients, leave }, from, to), employee })),
    [employees, entries, tasks, projects, clients, leave, from, to]
  )
  const team = teamKpis(rows)
  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const pct = (n: number | null) => (n === null ? "—" : `${n}%`)

  const cards: MetricCardItem[] = [
    { key: "util", title: t("teamUtilization"), value: pct(team.utilization), valueClassName: "text-primary", footer: { icon: Gauge, text: t("targetPercent", { target: UTILIZATION_TARGET }) } },
    { key: "billable", title: t("billableHours"), value: `${team.billableHours} h`, footer: { icon: Clock, text: t("ofLoggedHours", { hours: team.loggedHours }) } },
    { key: "revenue", title: t("revenuePerPerson"), value: money(team.revenuePerPerson), valueClassName: "text-success-foreground", footer: { icon: DollarSign, text: t("revenueTotal", { amount: money(team.revenue) }) } },
    { key: "ontime", title: t("onTimeDelivery"), value: pct(team.onTime), footer: { icon: CheckCircle, text: t("tasksDoneByDueDate") } },
  ]

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "name",
        accessorFn: (r) => r.employee.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("employee")} />,
        filterFn: (row, id, value: string) => String(row.getValue(id)).toLowerCase().includes(String(value ?? "").toLowerCase()),
        cell: ({ row }) => (
          <button type="button" onClick={() => setSelected(row.original)} className="flex items-center gap-3 text-left hover:text-primary">
            <SpaceAvatar name={row.original.employee.name} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{row.original.employee.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{row.original.employee.jobTitle}</span>
            </span>
          </button>
        ),
      },
      {
        id: "utilization",
        accessorFn: (r) => r.utilization ?? -1,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("utilization")} />,
        cell: ({ row }) => {
          const u = row.original.utilization
          return (
            <span className="flex min-w-36 items-center gap-2">
              <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                <span className="absolute inset-y-0 start-0 rounded-full bg-primary" style={{ width: `${Math.min(100, u ?? 0)}%` }} />
                <span className="absolute inset-y-0 w-0.5 bg-foreground/50" style={{ insetInlineStart: `${UTILIZATION_TARGET}%` }} />
              </span>
              <Badge variant="outline" className={cn("tabular-nums", utilizationClass(u))}>{pct(u)}</Badge>
            </span>
          )
        },
      },
      {
        id: "billable",
        accessorFn: (r) => r.billableHours,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("billableHours")} />,
        cell: ({ row }) => (
          <span className="flex flex-col text-sm tabular-nums">
            {row.original.billableHours} h
            <span className="text-xs text-muted-foreground">{t("ofAvailable", { hours: row.original.availableHours })}</span>
          </span>
        ),
      },
      {
        id: "revenue",
        accessorFn: (r) => r.revenue,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("revenue")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatMoney(row.original.revenue, workspace.currency, locale)}</span>,
      },
      {
        id: "tasks",
        accessorFn: (r) => r.tasksCompleted,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("tasksCompleted")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.tasksCompleted}</span>,
      },
      {
        id: "ontime",
        accessorFn: (r) => r.onTime ?? -1,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("onTime")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.onTime)}</span>,
      },
      {
        id: "accuracy",
        accessorFn: (r) => r.estimateAccuracy ?? -1,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("estimateAccuracy")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.estimateAccuracy)}</span>,
      },
    ],
    [t, locale, workspace.currency]
  )

  const periods: { id: KpiPeriod; label: string }[] = [
    { id: "month", label: t("thisMonth") },
    { id: "30d", label: t("last30Days") },
    { id: "quarter", label: t("thisQuarter") },
  ]

  const openTasks = selected
    ? tasks.filter((x) => x.assigneeId === selected.employeeId && x.status !== TaskStatus.DONE).sort((a, b) => (a.dueDate ?? "9").localeCompare(b.dueDate ?? "9"))
    : []

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label={t("period")} className="flex gap-1 rounded-full bg-muted p-1">
            {periods.map((p) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={period === p.id}
                onClick={() => setPeriod(p.id)}
                className={cn("h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors", period === p.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {formatShortDate(from, locale)} – {formatShortDate(to, locale)}
          </p>
        </div>
      </PageHeader>
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <DataTable
        title={t("people")}
        isLoading={isLoading}
        columns={columns}
        data={rows}
        searchColumnId="name"
        searchPlaceholder={t("searchByEmployee")}
        exportFilename="team-kpis"
        getExportData={() =>
          rows.map((r) => ({
            employee: r.employee.name,
            utilization: r.utilization ?? "",
            billableHours: r.billableHours,
            availableHours: r.availableHours,
            revenue: r.revenue,
            tasksCompleted: r.tasksCompleted,
            onTime: r.onTime ?? "",
            estimateAccuracy: r.estimateAccuracy ?? "",
          }))
        }
      />
      <p className="text-xs text-muted-foreground">{t("kpiDefinitions", { target: UTILIZATION_TARGET })}</p>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4">
                  <SpaceAvatar name={selected.employee.name} size="lg" />
                  <div>
                    <SheetTitle>{selected.employee.name}</SheetTitle>
                    <SheetDescription>{selected.employee.jobTitle}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-4 pb-6">
                <dl className="grid grid-cols-2 gap-3">
                  {[
                    { label: t("utilization"), value: pct(selected.utilization) },
                    { label: t("billableHours"), value: `${selected.billableHours} / ${selected.availableHours} h` },
                    { label: t("revenue"), value: money(selected.revenue) },
                    { label: t("onTime"), value: pct(selected.onTime) },
                    { label: t("tasksCompleted"), value: selected.tasksCompleted },
                    { label: t("estimateAccuracy"), value: pct(selected.estimateAccuracy) },
                  ].map((m) => (
                    <div key={m.label} className="rounded-2xl border border-border bg-card p-3">
                      <dt className="text-xs text-muted-foreground">{m.label}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{m.value}</dd>
                    </div>
                  ))}
                </dl>
                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("openTasks")}</h3>
                  {openTasks.length === 0 && <p className="text-sm text-muted-foreground">{t("noOpenTasks")}</p>}
                  <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                    {openTasks.map((task) => (
                      <li key={task.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                        <span className="min-w-0">
                          <span className="block truncate">{task.title}</span>
                          <span className="text-xs text-muted-foreground">{projects.find((p) => p.id === task.projectId)?.code}</span>
                        </span>
                        <span className={cn("shrink-0 text-xs tabular-nums", isTaskOverdue(task) ? "font-medium text-destructive" : "text-muted-foreground")}>
                          {formatShortDate(task.dueDate, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

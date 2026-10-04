"use client"

import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  DollarSign,
  Flag,
  Gauge,
  Receipt,
  TrendingUp,
  TreePalm,
} from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { addDays, displayStatus, invoiceBalance, toBase, weekStart } from "@/lib/workforce/billing"
import { MilestoneState, milestoneState, projectStatsById, todayIso } from "@/lib/workforce/project-metrics"
import { projectProfit } from "@/lib/workforce/profitability"
import { employeeKpis, periodRange, teamKpis, weeklyRevenue } from "@/lib/workforce/kpis"
import { EmployeeStatus } from "@/types/workforce"
import { ProjectHealth, WorkProjectStatus } from "@/types/work-projects"
import { TimeEntryStatus } from "@/types/work-billing"
import { LeaveStatus } from "@/types/work-planning"
import { ExpenseStatus } from "@/types/work-costs"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { HEALTH_CLASS, HEALTH_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"

const WEEKS = 8

export default function ExecutivePage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  // Profit and margin need the costs permission (BR-9)
  const canSeeCosts = can(authedUser, AdminPermissionsPlatform.COSTS_READ)
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: milestones = [] } = useMilestones()
  const { data: entries = [] } = useTimeEntries()
  const { data: invoices = [] } = useClientInvoices()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const holidays = useMemo(() => settings?.holidays.map((h) => h.date) ?? [], [settings])
  const { data: expenses = [] } = useExpenses()

  const today = todayIso()
  const money = (n: number) => formatMoney(n, workspace.currency, locale)

  const figures = useMemo(() => {
    // What clients still owe, in the base currency, after payments and credit notes
    const open = invoices.filter((i) => invoiceBalance(i, invoices) > 0)
    const overdue = open.filter((i) => displayStatus(i, today, invoices) === "overdue")
    const total = (list: typeof invoices) => list.reduce((s, i) => s + toBase(invoiceBalance(i, invoices), i), 0)
    const since = addDays(today, -29)
    const collectedAmount = invoices.flatMap((i) => (i.payments ?? []).filter((p) => p.date >= since).map((p) => toBase(p.amount, i))).reduce((s, n) => s + n, 0)

    const active = projects.filter((p) => p.status !== WorkProjectStatus.CANCELLED)
    const profits = active.map((p) => ({ project: p, ...projectProfit(p, { entries, tasks, expenses, employees, clients }) }))
    const revenue = profits.reduce((s, p) => s + p.revenue, 0)
    const profit = profits.reduce((s, p) => s + p.profit, 0)

    const stats = projectStatsById(projects, tasks, today)
    const flagged = projects
      .filter((p) => [WorkProjectStatus.ACTIVE, WorkProjectStatus.PLANNING, WorkProjectStatus.ON_HOLD].includes(p.status))
      .filter((p) => [ProjectHealth.AT_RISK, ProjectHealth.LATE].includes(stats.get(p.id)!.health))

    const { from, to } = periodRange("30d", today)
    const team = teamKpis(
      employees
        .filter((e) => e.status !== EmployeeStatus.INACTIVE && e.billableRate > 0)
        .map((e) => employeeKpis(e, { entries, tasks, projects, clients, leave, holidays }, from, to))
    )

    const byClient = new Map<string, number>()
    for (const p of profits) if (p.project.clientId) byClient.set(p.project.clientId, (byClient.get(p.project.clientId) ?? 0) + p.revenue)
    const topClients = [...byClient.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)

    const soon = addDays(today, 14)
    const upcoming = milestones
      .filter((m) => m.dueDate >= today && m.dueDate <= soon && milestoneState(m, tasks, today) !== MilestoneState.REACHED)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

    const mondays = Array.from({ length: WEEKS }, (_, i) => addDays(weekStart(today), (i - WEEKS + 1) * 7))
    const weekly = weeklyRevenue({ entries, tasks, projects, clients, leave, employees }, mondays)

    return {
      outstanding: total(open),
      openCount: open.length,
      overdue: total(overdue),
      overdueCount: overdue.length,
      collected: collectedAmount,
      revenue,
      profit,
      margin: revenue > 0 ? Math.round((profit / revenue) * 100) : null,
      flagged,
      stats,
      team,
      topClients,
      upcoming,
      weekly,
      waiting: {
        hours: entries.filter((e) => e.status === TimeEntryStatus.SUBMITTED).length,
        leave: leave.filter((r) => r.status === LeaveStatus.PENDING).length,
        expenses: expenses.filter((x) => x.status === ExpenseStatus.SUBMITTED).length,
      },
    }
  }, [invoices, projects, tasks, milestones, entries, expenses, employees, clients, leave, holidays, today])

  const cards: MetricCardItem[] = [
    { key: "revenue", title: t("revenueEarned"), value: money(figures.revenue), valueClassName: "text-primary", footer: { icon: TrendingUp, text: figures.margin === null ? t("noRevenueYet") : canSeeCosts ? t("profitAndMargin", { profit: money(figures.profit), margin: figures.margin }) : t("approvedHoursAndPaid") } },
    { key: "outstanding", title: t("outstanding"), value: money(figures.outstanding), footer: { icon: Clock, text: t("sentInvoicesCount", { count: figures.openCount }) } },
    { key: "overdue", title: t("overdue"), value: money(figures.overdue), valueClassName: figures.overdueCount ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("pastDueCount", { count: figures.overdueCount }) } },
    { key: "util", title: t("teamUtilization"), value: figures.team.utilization === null ? "—" : `${figures.team.utilization}%`, valueClassName: "text-success-foreground", footer: { icon: Gauge, text: t("last30Days") } },
  ]

  const chartConfig = { revenue: { label: t("revenue"), color: "var(--chart-1)" } } satisfies ChartConfig
  const weekLabel = (monday: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${monday}T00:00:00`))

  const waitingItems = [
    { key: "hours", count: figures.waiting.hours, label: t("hourEntriesToApprove", { count: figures.waiting.hours }), href: "/dashboard/time-approvals", icon: Clock },
    { key: "leave", count: figures.waiting.leave, label: t("leaveRequestsToDecide", { count: figures.waiting.leave }), href: "/dashboard/leave", icon: TreePalm },
    { key: "expenses", count: figures.waiting.expenses, label: t("expensesToReview", { count: figures.waiting.expenses }), href: "/dashboard/expenses", icon: Receipt },
    { key: "overdue", count: figures.overdueCount, label: t("overdueInvoicesToChase", { count: figures.overdueCount }), href: "/dashboard/client-invoices", icon: DollarSign },
  ].filter((w) => w.count > 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5 xl:col-span-2">
          <header className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">{t("revenueByWeek")}</h2>
              <p className="text-sm text-muted-foreground">{t("revenueByWeekHint")}</p>
            </div>
            <p className="text-sm text-muted-foreground">{t("collectedLast30", { amount: money(figures.collected) })}</p>
          </header>
          <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full">
            <BarChart accessibilityLayer data={figures.weekly} margin={{ left: 4, right: 4 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={weekLabel} />
              <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => money(v)} />
              <ChartTooltip
                cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) => t("weekOf", { week: weekLabel(String(value)) })}
                    formatter={(value, _name, item) => (
                      <span className="flex flex-col">
                        <span className="font-medium tabular-nums">{money(Number(value))}</span>
                        <span className="text-xs text-muted-foreground">{t("approvedHoursCount", { hours: item.payload.hours })}</span>
                      </span>
                    )}
                  />
                }
              />
              <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ChartContainer>
          <table className="sr-only">
            <caption>{t("revenueByWeek")}</caption>
            <tbody>
              {figures.weekly.map((w) => (
                <tr key={w.week}><th>{weekLabel(w.week)}</th><td>{money(w.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("waitingForYou")}</h2>
          {waitingItems.length === 0 ? (
            <p className="flex items-center gap-2 rounded-2xl bg-success-soft/60 p-4 text-sm text-success-foreground">
              <CheckCircle className="size-4" />
              {t("allCaughtUp")}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {waitingItems.map((w) => (
                <li key={w.key}>
                  <Link href={w.href} className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm transition-colors hover:bg-muted/50">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-info-soft text-info-foreground">
                      <w.icon className="size-4" />
                    </span>
                    <span className="flex-1">{w.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("projectsNeedingAttention")}</h2>
          {figures.flagged.length === 0 && <p className="text-sm text-muted-foreground">{t("allProjectsOnTrack")}</p>}
          <ul className="flex flex-col gap-2">
            {figures.flagged.map((p) => {
              const s = figures.stats.get(p.id)!
              return (
                <li key={p.id}>
                  <Link href={`/dashboard/projects/${p.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3 text-sm hover:bg-muted/50">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.progress}% · {t("dueOn", { date: formatShortDate(p.dueDate, locale) })}
                        {s.overdue > 0 && ` · ${t("overdueCount", { count: s.overdue })}`}
                      </span>
                    </span>
                    <Badge variant="outline" className={HEALTH_CLASS[s.health]}>{t(HEALTH_LABEL[s.health])}</Badge>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("upcomingMilestones")}</h2>
          {figures.upcoming.length === 0 && <p className="text-sm text-muted-foreground">{t("noMilestonesNext14")}</p>}
          <ul className="flex flex-col gap-2">
            {figures.upcoming.map((m) => (
              <li key={m.id}>
                <Link href={`/dashboard/projects/${m.projectId}`} className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm hover:bg-muted/50">
                  <Flag className="size-4 shrink-0 text-warning-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{m.title}</span>
                    <span className="text-xs text-muted-foreground">{projects.find((p) => p.id === m.projectId)?.name}</span>
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatShortDate(m.dueDate, locale)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("topClients")}</h2>
          {figures.topClients.length === 0 && <p className="text-sm text-muted-foreground">{t("noRevenueYet")}</p>}
          <ul className="flex flex-col gap-3">
            {figures.topClients.map(([clientId, amount]) => {
              const max = figures.topClients[0]![1] || 1
              return (
                <li key={clientId} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex justify-between gap-3">
                    <span className="truncate font-medium">{clients.find((c) => c.id === clientId)?.name ?? "—"}</span>
                    <span className="tabular-nums">{money(amount)}</span>
                  </span>
                  <span className="h-2 rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-primary" style={{ width: `${(amount / max) * 100}%` }} />
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

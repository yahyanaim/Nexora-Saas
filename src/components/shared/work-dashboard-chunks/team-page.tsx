"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, CheckCircle, ClipboardCheck, FolderKanban, Gauge, Renew } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { teamOverview } from "@/lib/workforce/dashboards"
import { cn } from "@/lib/utils"
import { HEALTH_CLASS, HEALTH_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatHours } from "../work-billing-chunks/billing-labels"

const ALL = "__all__"

/** The manager's home: projects at risk, budgets, team workload, approvals (RPT-2, RPT-9). */
export default function TeamPage() {
  const t = useTranslations()
  const locale = useLocale()
  const queryClient = useQueryClient()
  const workspace = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const showMoney = can(authedUser, AdminPermissionsPlatform.COSTS_READ)
  const { data: employees = [], isLoading: l1 } = useEmployees()
  const { data: projects = [], isLoading: l2 } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: entries = [] } = useTimeEntries()
  const { data: clients = [] } = useClients()
  const { data: leave = [] } = useLeave()
  const { data: expenses = [] } = useExpenses()
  const { data: settings } = useWorkspaceSettings()
  const [managerId, setManagerId] = useState(ALL)
  const [computedAt, setComputedAt] = useState(() => new Date())

  const managers = useMemo(() => employees.filter((e) => projects.some((p) => p.managerId === e.id)), [employees, projects])
  const scope = useMemo(() => {
    if (managerId === ALL) return undefined
    const own = projects.filter((p) => p.managerId === managerId)
    return {
      projectIds: own.map((p) => p.id),
      employeeIds: [...new Set([...employees.filter((e) => e.managerId === managerId).map((e) => e.id), ...own.flatMap((p) => p.memberIds)])],
    }
  }, [managerId, projects, employees])

  const overview = useMemo(
    () => teamOverview({ projects, tasks, entries, employees, clients, expenses, leave, holidays: (settings?.holidays ?? []).map((h) => h.date) }, scope),
    [projects, tasks, entries, employees, clients, expenses, leave, settings, scope]
  )
  const { attention, budgets, workload, approvals } = overview
  const overloaded = workload.filter((w) => w.load > 100).length
  const avgLoad = workload.length ? Math.round(workload.reduce((s, w) => s + Math.min(w.load, 200), 0) / workload.length) : 0
  const approvalsTotal = approvals.people + approvals.leave + approvals.expenses

  const refresh = () => {
    void queryClient.invalidateQueries()
    setComputedAt(new Date())
  }

  const cards: MetricCardItem[] = [
    { key: "risk", title: t("dashProjectsAttention"), value: attention.length, valueClassName: attention.length ? "text-danger-foreground" : "text-success-foreground", footer: { icon: AlertTriangle, text: t("dashLateCount", { count: attention.filter((a) => a.health === "late").length }) } },
    { key: "approvals", title: t("dashApprovalsWaiting"), value: approvalsTotal, valueClassName: approvalsTotal ? "text-warning-foreground" : undefined, footer: { icon: ClipboardCheck, text: t("dashApprovalsDetail", { hours: formatHours(approvals.hours), leave: approvals.leave, expenses: approvals.expenses }) } },
    { key: "load", title: t("dashTeamLoad"), value: `${avgLoad}%`, valueClassName: avgLoad > 100 ? "text-danger-foreground" : "text-primary", footer: { icon: Gauge, text: t("dashOverloadedCount", { count: overloaded }) } },
    { key: "budget", title: t("dashBudgetAlerts"), value: budgets.filter((b) => b.alert !== "none").length, footer: { icon: FolderKanban, text: t("dashBudgetsTracked", { count: budgets.length }) } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              aria-label={t("dashManagerFilter")}
              className="h-9 rounded-full border border-border bg-card px-3 text-sm"
            >
              <option value={ALL}>{t("dashAllManagers")}</option>
              {managers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground tabular-nums">
              {t("dashUpdatedAt", { time: new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(computedAt) })}
            </span>
            <Button variant="outline" size="sm" onClick={refresh}>
              <Renew className="size-4" />
              {t("refresh")}
            </Button>
          </div>
        }
      />
      <MetricCardGrid cards={cards} isLoading={l1 || l2} />

      <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{t("dashProjectsAttention")}</h2>
          <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">{t("dashAllProjects")}</Link>
        </header>
        {attention.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
            <CheckCircle className="size-6 text-success-foreground" />
            <p className="font-medium">{t("dashAllOnTrack")}</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {attention.map((a) => (
              <article key={a.project.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                <header className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/dashboard/projects/${a.project.id}`} className="block truncate font-medium hover:text-primary">{a.project.name}</Link>
                    <p className="text-xs text-muted-foreground">
                      {a.project.code} · {t("dashDue", { date: formatShortDate(a.project.dueDate, locale) })}
                    </p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", HEALTH_CLASS[a.health])}>{t(HEALTH_LABEL[a.health])}</span>
                </header>
                {a.budget.percent !== null && (
                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>{t("dashBudgetUsed")}</span>
                      <span className={cn("tabular-nums", a.budget.alert === "over" ? "text-danger-foreground" : a.budget.alert === "warning" ? "text-warning-foreground" : "")}>{a.budget.percent}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", a.budget.alert === "over" ? "bg-destructive" : a.budget.alert === "warning" ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, a.budget.percent)}%` }} />
                    </div>
                  </div>
                )}
                {a.causes.length > 0 ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">{t("dashCausedBy")}</p>
                    <ul className="space-y-1 text-sm">
                      {a.causes.slice(0, 4).map((task) => (
                        <li key={task.id} className="flex justify-between gap-2">
                          <span className="truncate">{task.title}</span>
                          <span className="shrink-0 text-xs text-danger-foreground tabular-nums">{formatShortDate(task.dueDate, locale)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">{a.project.healthOverride ? t("dashOverrideReason", { reason: a.project.healthOverride.reason }) : t("dashScheduleOrBudget")}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("dashWorkloadWeek")}</h2>
            <Link href="/dashboard/workload" className="text-sm text-primary hover:underline">{t("dashOpenWorkload")}</Link>
          </header>
          <ul className="space-y-3">
            {workload.map((w) => (
              <li key={w.employee.id} className="flex items-center gap-3">
                <SpaceAvatar name={w.employee.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate">{w.employee.name}</span>
                    <span className={cn("tabular-nums text-xs", w.load > 100 ? "text-danger-foreground" : w.load > 85 ? "text-warning-foreground" : "text-muted-foreground")}>
                      {t("dashPlannedOf", { planned: formatHours(w.planned), capacity: formatHours(w.capacity) })} · {w.load >= 999 ? "—" : `${w.load}%`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", w.load > 100 ? "bg-destructive" : w.load > 85 ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, w.load)}%` }} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <h2 className="mb-3 font-semibold">{t("dashApprovalsWaiting")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {[
              { href: "/dashboard/time-approvals", label: t("dashHoursToApprove"), value: approvals.hourEntries ? t("dashHoursPeople", { hours: formatHours(approvals.hours), people: approvals.people }) : "0" },
              { href: "/dashboard/leave", label: t("dashLeaveToDecide"), value: String(approvals.leave) },
              { href: "/dashboard/expenses", label: t("dashExpensesToReview"), value: String(approvals.expenses) },
            ].map((row) => (
              <li key={row.href}>
                <Link href={row.href} className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/40">
                  <span>{row.label}</span>
                  <span className="font-medium tabular-nums">{row.value}</span>
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mb-3 mt-6 font-semibold">{t("dashBudgetUsed")}</h2>
          <ul className="space-y-3">
            {budgets.slice(0, 6).map((b) => (
              <li key={b.project.id}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate">{b.project.name}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {showMoney ? `${formatMoney(b.used, workspace.currency, locale)} / ${formatMoney(b.budget, workspace.currency, locale)} · ` : ""}
                    {b.percent ?? 0}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", b.alert === "over" ? "bg-destructive" : b.alert === "warning" ? "bg-warning" : "bg-primary")} style={{ width: `${Math.min(100, b.percent ?? 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}

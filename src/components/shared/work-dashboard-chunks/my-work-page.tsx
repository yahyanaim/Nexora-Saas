"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, CalendarDays, CheckCircle, Clock, FolderKanban, Star, TreePalm } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useReviews } from "../work-reviews-chunks/use-reviews"
import { reviewAction } from "@/lib/workforce/reviews"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { myDay, vacationAllowance } from "@/lib/workforce/dashboards"
import { todayIso } from "@/lib/workforce/project-metrics"
import { EmployeeStatus } from "@/types/workforce"
import { cn } from "@/lib/utils"
import { PRIORITY_LABEL, TASK_STATUS_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"
import { LEAVE_TYPE_LABEL } from "../work-planning-chunks/planning-labels"
import { formatHours } from "../work-billing-chunks/billing-labels"

const REASON_CLASS = {
  overdue: "bg-danger-soft text-danger-foreground",
  today: "bg-warning-soft text-warning-foreground",
  soon: "bg-info-soft text-info-foreground",
  in_progress: "bg-muted text-muted-foreground",
} as const

/** The employee's home: today's tasks, this week's hours, leave balance (RPT-3). */
export default function MyWorkPage() {
  const t = useTranslations()
  const locale = useLocale()
  const currentEmployee = useCurrentEmployee()
  const { data: reviews = [] } = useReviews()
  const { data: employees = [], isLoading: loadingPeople } = useEmployees()
  const { data: tasks = [], isLoading: loadingTasks } = useTasks()
  const { data: projects = [] } = useProjects()
  const { data: entries = [] } = useTimeEntries()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()

  const staff = useMemo(() => employees.filter((e) => e.status !== EmployeeStatus.INACTIVE), [employees])
  // The signed-in person; anyone can be picked to preview their view
  const matched = staff.find((e) => e.id === currentEmployee?.id)
  const [picked, setPicked] = useState("")
  const employee = staff.find((e) => e.id === (picked || matched?.id)) ?? staff.find((e) => e.billableRate > 0) ?? staff[0]

  const today = todayIso()
  const day = useMemo(
    () =>
      employee
        ? myDay(
            employee,
            { tasks, entries, leave, holidays: (settings?.holidays ?? []).map((h) => h.date), vacationAllowance: vacationAllowance(settings?.leaveTypes) },
            today
          )
        : null,
    [employee, tasks, entries, leave, settings, today]
  )
  const isLoading = loadingPeople || loadingTasks
  // Reviews where it is this person's turn: rate themselves, review someone, or read a finished review
  const reviewTodos = employee ? reviews.filter((r) => reviewAction(r, { employeeId: employee.id, isAdmin: false })) : []
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—"
  const projectOf = (id: string) => projects.find((p) => p.id === id)
  const dayName = (iso: string) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${iso}T00:00:00`))

  const gap = day ? Math.max(0, day.expectedThisWeek - day.loggedThisWeek) : 0
  const cards: MetricCardItem[] = day
    ? [
        {
          key: "hours",
          title: t("dashHoursThisWeek"),
          value: formatHours(day.loggedThisWeek),
          valueClassName: gap > 0 ? "text-warning-foreground" : "text-success-foreground",
          footer: { icon: Clock, text: gap > 0 ? t("dashHoursToGo", { hours: formatHours(gap) }) : t("dashWeekComplete") },
        },
        {
          key: "tasks",
          title: t("dashMyTasks"),
          value: day.tasks.length,
          valueClassName: day.tasks.some((x) => x.reason === "overdue") ? "text-danger-foreground" : undefined,
          footer: { icon: AlertTriangle, text: t("dashOverdueCount", { count: day.tasks.filter((x) => x.reason === "overdue").length }) },
        },
        {
          key: "leave",
          title: t("dashLeaveBalance"),
          value: t("dashDays", { count: day.leave.remaining }),
          valueClassName: "text-primary",
          footer: { icon: TreePalm, text: t("dashLeaveUsed", { used: day.leave.used, pending: day.leave.pending, allowance: day.leave.allowance }) },
        },
        {
          key: "approval",
          title: t("dashAwaitingApproval"),
          value: formatHours(day.awaitingApproval),
          valueClassName: day.sentBack.length ? "text-danger-foreground" : undefined,
          footer: { icon: CheckCircle, text: day.sentBack.length ? t("dashSentBackCount", { count: day.sentBack.length }) : t("dashNothingSentBack") },
        },
      ]
    : []
  const maxDay = Math.max(1, ...(day?.week.map((d) => Math.max(d.hours, d.expected)) ?? [1]))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title={employee ? t("dashHello", { name: employee.name.split(" ")[0] ?? employee.name }) : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={employee?.id ?? ""} onValueChange={setPicked}>
              <SelectTrigger className="w-56 bg-card" aria-label={t("dashViewingAs")}>
                <SelectValue placeholder={t("dashViewingAs")}>{employee?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button asChild>
              <Link href="/dashboard/timesheets">
                <Clock className="size-4" />
                {t("dashLogTime")}
              </Link>
            </Button>
          </div>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {reviewTodos.length > 0 && (
        <section className="rounded-3xl border border-primary/30 bg-info-soft/40 p-5 shadow-panel">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold"><Star className="size-4 text-primary" />{t("dashReviewsWaiting")}</h2>
            <Link href="/dashboard/reviews" className="text-sm text-primary hover:underline">{t("reviews")}</Link>
          </header>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border bg-card">
            {reviewTodos.map((r) => {
              const action = reviewAction(r, { employeeId: employee!.id, isAdmin: false })!
              return (
                <li key={r.id}>
                  <Link href="/dashboard/reviews" className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-muted/60">
                    <span className="min-w-0 truncate font-medium">{r.employeeId === employee!.id ? r.period : `${nameOf(r.employeeId)} · ${r.period}`}</span>
                    <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">{t(`reviewAction_${action}`)}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel lg:col-span-2">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("dashMyDay")}</h2>
            <Link href="/dashboard/projects" className="text-sm text-primary hover:underline">{t("dashAllProjects")}</Link>
          </header>
          {day && day.tasks.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-10 text-center">
              <CheckCircle className="size-6 text-success-foreground" />
              <p className="font-medium">{t("dashNoTasks")}</p>
              <p className="text-sm text-muted-foreground">{t("dashNoTasksHint")}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {day?.tasks.slice(0, 12).map(({ task, reason }) => {
                const project = projectOf(task.projectId)
                return (
                  <li key={task.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", REASON_CLASS[reason])}>{t(`dashReason_${reason}`)}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/dashboard/projects/${task.projectId}`} className="block truncate font-medium hover:text-primary">{task.title}</Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {project?.code} · {project?.name} · {t(TASK_STATUS_LABEL[task.status])} · {t(PRIORITY_LABEL[task.priority])}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                      <CalendarDays className="size-3.5" />
                      {formatShortDate(task.dueDate, locale)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("dashMyWeek")}</h2>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatHours(day?.loggedThisWeek ?? 0)} / {formatHours(day?.expectedThisWeek ?? 0)}
            </span>
          </header>
          <div className="flex h-36 items-end gap-2" role="img" aria-label={t("dashMyWeek")}>
            {day?.week.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="relative flex h-28 w-full items-end justify-center rounded-md bg-muted/40">
                  {d.expected > 0 && (
                    <div className="absolute inset-x-1 border-t border-dashed border-muted-foreground/50" style={{ bottom: `${(d.expected / maxDay) * 100}%` }} />
                  )}
                  <div
                    title={`${formatHours(d.hours)} / ${formatHours(d.expected)}`}
                    className={cn("w-3/5 rounded-t-md", d.date === today ? "bg-primary" : d.hours >= d.expected && d.expected > 0 ? "bg-success" : "bg-primary/50")}
                    style={{ height: `${(d.hours / maxDay) * 100}%` }}
                  />
                </div>
                <span className={cn("text-xs", d.date === today ? "font-semibold text-foreground" : "text-muted-foreground")}>{dayName(d.date)}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("dashWeekLegend")}</p>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <h2 className="mb-3 font-semibold">{t("dashSentBack")}</h2>
          {!day?.sentBack.length ? (
            <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t("dashNothingSentBack")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {day.sentBack.slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{projectOf(e.projectId)?.name ?? "—"} · {formatShortDate(e.date, locale)}</p>
                    <p className="truncate text-xs text-danger-foreground">{e.rejectionReason}</p>
                  </div>
                  <span className="tabular-nums">{formatHours(e.hours)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{t("dashUpcomingLeave")}</h2>
            <Link href="/dashboard/leave" className="text-sm text-primary hover:underline">{t("dashRequestLeave")}</Link>
          </header>
          {!day?.upcomingLeave.length ? (
            <p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t("dashNoUpcomingLeave")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {day.upcomingLeave.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <span className="flex items-center gap-2">
                    <FolderKanban className="size-4 text-muted-foreground" />
                    {t(LEAVE_TYPE_LABEL[r.type])} · {formatShortDate(r.startDate, locale)} – {formatShortDate(r.endDate, locale)}
                  </span>
                  <Badge variant={r.status === "approved" ? "success" : "warning"}>{t(r.status === "approved" ? "dashApproved" : "dashPending")}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

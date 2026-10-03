"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, ChevronLeft, ChevronRight, Flag, FolderKanban, TreePalm } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useLeave } from "@/hooks/workforce/use-leave"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { isWeekend, workingDays } from "@/lib/workforce/planning"
import { TaskStatus, WorkProjectStatus } from "@/types/work-projects"
import { LeaveStatus } from "@/types/work-planning"

type Kind = "project" | "milestone" | "task" | "leave"

interface CalendarEvent {
  id: string
  kind: Kind
  date: string
  label: string
  href?: string
  tentative?: boolean
}

const KIND_STYLE: Record<Kind, string> = {
  project: "bg-primary/10 text-primary",
  milestone: "bg-warning-soft text-warning-foreground",
  task: "bg-muted text-foreground",
  leave: "bg-success-soft text-success-foreground",
}

const KIND_ICON = { project: FolderKanban, milestone: Flag, task: CheckCircle2, leave: TreePalm }
const MAX_PER_DAY = 3

export default function CalendarPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { data: projects = [] } = useProjects()
  const { data: milestones = [] } = useMilestones()
  const { data: tasks = [] } = useTasks()
  const { data: leave = [] } = useLeave()
  const { data: employees = [] } = useEmployees()

  const today = todayIso()
  const [month, setMonth] = useState(today.slice(0, 7)) // yyyy-mm
  const [shown, setShown] = useState<Record<Kind, boolean>>({ project: true, milestone: true, task: true, leave: true })

  const events = useMemo(() => {
    const list: CalendarEvent[] = []
    const projectName = (id: string) => projects.find((p) => p.id === id)?.code ?? ""
    for (const p of projects) {
      if (p.dueDate && p.status !== WorkProjectStatus.CANCELLED) {
        list.push({ id: `p-${p.id}`, kind: "project", date: p.dueDate, label: t("projectDue", { name: p.name }), href: `/dashboard/projects/${p.id}` })
      }
    }
    for (const m of milestones) {
      list.push({ id: `m-${m.id}`, kind: "milestone", date: m.dueDate, label: `${projectName(m.projectId)} · ${m.title}`, href: `/dashboard/projects/${m.projectId}` })
    }
    for (const task of tasks) {
      if (task.dueDate && task.status !== TaskStatus.DONE) {
        list.push({ id: `t-${task.id}`, kind: "task", date: task.dueDate, label: task.title, href: `/dashboard/projects/${task.projectId}` })
      }
    }
    for (const r of leave) {
      if (r.status !== LeaveStatus.APPROVED && r.status !== LeaveStatus.PENDING) continue
      const name = employees.find((e) => e.id === r.employeeId)?.name ?? "—"
      for (const d of workingDays(r.startDate, r.endDate)) {
        list.push({ id: `l-${r.id}-${d}`, kind: "leave", date: d, label: name, href: "/dashboard/leave", tentative: r.status === LeaveStatus.PENDING })
      }
    }
    return list
  }, [projects, milestones, tasks, leave, employees, t])

  const first = `${month}-01`
  const gridStart = weekStart(first)
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const visible = events.filter((e) => shown[e.kind])
  const byDay = (d: string) => visible.filter((e) => e.date === d)
  const monthDays = days.filter((d) => d.startsWith(month))

  const shiftMonth = (delta: number) => {
    const d = new Date(`${first}T00:00:00`)
    d.setMonth(d.getMonth() + delta)
    setMonth(todayIso(d).slice(0, 7))
  }

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${first}T00:00:00`))
  const weekdayNames = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${d}T00:00:00`)))
  const kinds: { kind: Kind; label: string }[] = [
    { kind: "project", label: t("projectDeadlines") },
    { kind: "milestone", label: t("milestones") },
    { kind: "task", label: t("taskDueDates") },
    { kind: "leave", label: t("leave") },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <Button variant="ghost" size="sm" aria-label={t("previousMonth")} onClick={() => shiftMonth(-1)}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-36 text-center text-sm font-medium capitalize">{monthLabel}</span>
              <Button variant="ghost" size="sm" aria-label={t("nextMonth")} onClick={() => shiftMonth(1)}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {month !== today.slice(0, 7) && (
              <Button variant="outline" size="sm" onClick={() => setMonth(today.slice(0, 7))}>
                {t("today")}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("show")}>
            {kinds.map(({ kind, label }) => {
              const Icon = KIND_ICON[kind]
              return (
                <button
                  key={kind}
                  type="button"
                  aria-pressed={shown[kind]}
                  onClick={() => setShown((s) => ({ ...s, [kind]: !s[kind] }))}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors",
                    shown[kind] ? cn("border-transparent", KIND_STYLE[kind]) : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </PageHeader>

      {/* Month grid (tablet and up) */}
      <section className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-panel md:block">
        <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-muted-foreground">
          {weekdayNames.map((name) => (
            <div key={name} className="px-3 py-2.5 capitalize">{name}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const items = byDay(d)
            const inMonth = d.startsWith(month)
            return (
              <div
                key={d}
                className={cn(
                  "flex min-h-28 flex-col gap-1 border-border p-1.5",
                  i % 7 !== 6 && "border-e",
                  i < 35 && "border-b",
                  (!inMonth || isWeekend(d)) && "bg-muted/30"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 items-center justify-center self-end rounded-full text-xs tabular-nums",
                    d === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60"
                  )}
                >
                  {Number(d.slice(8))}
                </span>
                {items.slice(0, MAX_PER_DAY).map((e) => <EventChip key={e.id} event={e} pendingLabel={t("pending")} />)}
                {items.length > MAX_PER_DAY && (
                  <span className="px-1.5 text-[11px] text-muted-foreground">{t("moreCount", { count: items.length - MAX_PER_DAY })}</span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Agenda (phones) */}
      <section className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:hidden">
        {monthDays.filter((d) => byDay(d).length).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("nothingThisMonth")}</p>
        )}
        {monthDays
          .filter((d) => byDay(d).length)
          .map((d) => (
            <div key={d} className="flex flex-col gap-1.5">
              <h3 className={cn("text-xs font-semibold", d === today ? "text-primary" : "text-muted-foreground")}>
                {new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00`))}
              </h3>
              {byDay(d).map((e) => <EventChip key={e.id} event={e} pendingLabel={t("pending")} />)}
            </div>
          ))}
      </section>
    </div>
  )
}

function EventChip({ event, pendingLabel }: { event: CalendarEvent; pendingLabel: string }) {
  const Icon = KIND_ICON[event.kind]
  const content = (
    <>
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{event.label}</span>
      {event.tentative && <span className="sr-only">({pendingLabel})</span>}
    </>
  )
  const cls = cn(
    "relative flex min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium",
    KIND_STYLE[event.kind],
    event.tentative && "border border-dashed border-current bg-transparent"
  )
  return event.href ? (
    <Link href={event.href} title={event.label} className={cn(cls, "hover:opacity-80")}>
      {content}
    </Link>
  ) : (
    <span className={cls}>{content}</span>
  )
}

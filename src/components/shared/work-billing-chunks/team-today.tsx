"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { CheckCircle, Clock, Play, UsersRound } from "@/components/ui/carbon/icons"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useRunningTimers, useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useExpenses } from "@/hooks/workforce/use-expenses"
import { hoursPerDay } from "@/lib/workforce/planning"
import { todayIso } from "@/lib/workforce/project-metrics"
import { TimeEntryStatus } from "@/types/work-billing"
import { ExpenseStatus } from "@/types/work-costs"
import { LeaveStatus } from "@/types/work-planning"
import { EmployeeStatus } from "@/types/workforce"

const elapsed = (startedAt: string, now: number) => {
  const minutes = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60000))
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`
}

/**
 * Today for an admin or manager who is on no project themselves (Phase 6h.5):
 * the team's day instead of empty personal cards — hours logged, timers
 * running now and what waits for their approval.
 */
export function TeamToday({ meId }: { meId?: string }) {
  const t = useTranslations()
  const today = todayIso()
  const { data: employees = [] } = useEmployees()
  const { data: entries = [] } = useTimeEntries()
  const { data: projects = [] } = useProjects()
  const { data: leave = [] } = useLeave()
  const { data: expenses = [] } = useExpenses()
  const { data: timers = [] } = useRunningTimers()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])

  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE && e.weeklyCapacity > 0 && e.id !== meId)
  const todays = entries.filter((e) => e.date === today && e.status !== TimeEntryStatus.REJECTED)
  const hoursOf = (id: string) => todays.filter((e) => e.employeeId === id).reduce((s, e) => s + e.hours, 0)
  const total = todays.reduce((s, e) => s + e.hours, 0)
  const logged = staff.filter((e) => hoursOf(e.id) > 0).length
  const waiting = {
    time: new Set(entries.filter((e) => e.status === TimeEntryStatus.SUBMITTED && e.employeeId !== meId).map((e) => e.employeeId)).size,
    leave: leave.filter((l) => l.status === LeaveStatus.PENDING && l.employeeId !== meId).length,
    expenses: expenses.filter((x) => x.status === ExpenseStatus.SUBMITTED && x.employeeId !== meId).length,
  }
  const person = (id: string) => employees.find((e) => e.id === id)
  const project = (id: string) => projects.find((p) => p.id === id)
  const people = [...staff].sort((a, b) => hoursOf(b.id) - hoursOf(a.id) || a.name.localeCompare(b.name))

  const cards: MetricCardItem[] = [
    { key: "hours", title: t("ttHours"), value: `${Math.round(total * 10) / 10} h`, valueClassName: "text-primary", footer: { icon: Clock, text: t("ttHoursHint") } },
    { key: "logged", title: t("ttLogged"), value: `${logged} / ${staff.length}`, footer: { icon: UsersRound, text: t("ttLoggedHint") } },
    { key: "timers", title: t("ttTimers"), value: timers.length, valueClassName: timers.length ? "text-success" : undefined, footer: { icon: Play, text: t("ttTimersHint") } },
    { key: "waiting", title: t("ttWaiting"), value: waiting.time + waiting.leave + waiting.expenses, valueClassName: waiting.time + waiting.leave + waiting.expenses ? "text-warning-foreground" : undefined, footer: { icon: CheckCircle, text: t("ttWaitingHint", waiting) } },
  ]

  return (
    <div className="flex flex-col gap-5">
      <p className="rounded-2xl bg-info-soft p-3 text-sm text-info-foreground">{t("ttIntro")}</p>
      <MetricCardGrid cards={cards} />

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-3 text-base font-semibold">{t("ttRunning")}</h2>
          {timers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("ttNoTimers")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {timers.map((tm) => (
                <li key={tm.employeeId} className="flex items-center gap-3 py-2.5">
                  <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:animate-none" /><span className="relative inline-flex size-2.5 rounded-full bg-success" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{person(tm.employeeId)?.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{project(tm.projectId)?.name ?? "—"}</p>
                  </div>
                  <span className="font-mono text-sm tabular-nums">{elapsed(tm.startedAt, now)}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" asChild><Link href="/dashboard/time-approvals">{t("ttApprove")}</Link></Button>
            <Button size="sm" variant="outline" asChild><Link href="/dashboard/team">{t("ttTeamDashboard")}</Link></Button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-3 text-base font-semibold">{t("ttByPerson")}</h2>
          <ul className="flex flex-col divide-y divide-border">
            {people.map((e) => {
              const h = hoursOf(e.id)
              const target = Math.round(hoursPerDay(e) * 10) / 10
              return (
                <li key={e.id} className="flex items-center gap-3 py-2">
                  <SpaceAvatar name={e.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.name}</p>
                    <Progress value={target > 0 ? Math.min(100, (h / target) * 100) : 0} aria-label={t("ttHoursOf", { name: e.name })} className="mt-1 h-1.5" />
                  </div>
                  <span className="w-20 text-end text-xs tabular-nums text-muted-foreground">{h} / {target} h</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>
    </div>
  )
}

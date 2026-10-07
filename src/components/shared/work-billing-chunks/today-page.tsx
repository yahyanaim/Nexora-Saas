"use client"

import { useEffect, useRef } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Clock, ListChecks, Receipt, Sunrise } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { TimerBar } from "./timer-bar"
import { TeamToday } from "./team-today"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentEmployee } from "@/hooks/workforce/use-current-employee"
import { useTimeEntries } from "@/hooks/workforce/use-work-billing"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { hoursPerDay } from "@/lib/workforce/planning"
import { todayIso } from "@/lib/workforce/project-metrics"
import { TimeEntryStatus } from "@/types/work-billing"
import { WorkProjectStatus } from "@/types/work-projects"

/**
 * The phone home screen of the installed app (Phase 6h.3): the timer first,
 * then today's hours against the day's target and the latest entries.
 */
export default function TodayPage() {
  const t = useTranslations()
  const locale = useLocale()
  const me = useCurrentEmployee()
  const { data: entries = [], isLoading } = useTimeEntries()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { authedUser } = useAuthGuard()
  const timerRef = useRef<HTMLDivElement>(null)
  // ?timer=1 (home-screen shortcut "Start timer") brings the timer into view
  const wantsTimer = useSearchParams().get("timer") === "1"
  useEffect(() => {
    if (wantsTimer) timerRef.current?.scrollIntoView({ block: "start" })
  }, [wantsTimer])

  const today = todayIso()
  const mine = entries.filter((e) => e.employeeId === me?.id && e.status !== TimeEntryStatus.REJECTED)
  const todayHours = mine.filter((e) => e.date === today).reduce((s, e) => s + e.hours, 0)
  const monday = weekStart(today)
  const weekHours = mine.filter((e) => e.date >= monday && e.date <= addDays(monday, 6)).reduce((s, e) => s + e.hours, 0)
  const target = me ? Math.round(hoursPerDay(me) * 10) / 10 : 8
  const recent = [...mine].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)).slice(0, 8)
  const myProjects = projects.filter((p) => (!me || p.memberIds.includes(me.id)) && p.status !== WorkProjectStatus.CANCELLED && p.status !== WorkProjectStatus.COMPLETED)
  // admins/managers with no projects of their own see the team's day (Phase 6h.5)
  const teamView = can(authedUser, AdminPermissionsPlatform.TIME_APPROVE) && myProjects.length === 0
  const project = (id: string) => projects.find((p) => p.id === id)
  const day = (iso: string) => (iso === today ? t("today") : new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`)))

  if (!isLoading && !me) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader />
        <EmptyState icon={Sunrise} title={t("todayNoEmployee")} hint={t("todayNoEmployeeHint")} />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-5">
      <PageHeader />

      <div className={teamView ? "flex flex-col gap-5" : "grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start"}>
      <div className="flex flex-col gap-5">
      {teamView ? <TeamToday meId={me?.id} /> : <>
      <div ref={timerRef} className="scroll-mt-24">
        {me && <TimerBar employeeId={me.id} projects={myProjects} tasks={tasks} />}
      </div>

      <section className="rounded-3xl border border-border bg-card p-5 shadow-panel">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{t("todayLogged")}</p>
            <p className="text-3xl font-semibold tabular-nums">{t("todayHoursOf", { hours: Math.round(todayHours * 100) / 100, target })}</p>
          </div>
          <p className="text-end text-sm text-muted-foreground">{t("todayWeek", { hours: Math.round(weekHours * 10) / 10 })}</p>
        </div>
        <Progress value={Math.min(100, target > 0 ? (todayHours / target) * 100 : 0)} aria-label={t("todayLogged")} className="mt-3 h-2.5" />
      </section>
      </>}

      <div className="grid grid-cols-3 gap-3">
        {[
          { href: "/dashboard/timesheets", icon: Clock, label: t("todayLogTime") },
          { href: "/dashboard/expenses?new=1", icon: Receipt, label: t("todayNewExpense") },
          { href: "/dashboard/my-work", icon: ListChecks, label: t("todayMyTasks") },
        ].map((a) => (
          <Button key={a.href} variant="outline" asChild className="h-auto flex-col gap-1.5 rounded-2xl py-4">
            <Link href={a.href}><a.icon className="size-5" /><span className="text-xs">{a.label}</span></Link>
          </Button>
        ))}
      </div>

      </div>

      {!teamView && <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("todayRecent")}</h2>
        {isLoading ? (
          <ListSkeleton />
        ) : recent.length === 0 ? (
          <EmptyState icon={Clock} title={t("todayNoEntries")} hint={t("todayNoEntriesHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{project(e.projectId)?.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{day(e.date)}{e.note ? ` · ${e.note}` : ""}</p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{e.hours} h</span>
              </li>
            ))}
          </ul>
        )}
      </section>}
      </div>
    </div>
  )
}

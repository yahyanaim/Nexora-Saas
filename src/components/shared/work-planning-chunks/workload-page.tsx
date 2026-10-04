"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, Clock, Gauge, TreePalm } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useTasks } from "@/hooks/workforce/use-work-projects"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { leaveDays, loadPercent, plannedHours, weeklyCapacity } from "@/lib/workforce/planning"
import { EmployeeStatus } from "@/types/workforce"
import { TaskStatus } from "@/types/work-projects"

const WEEKS = 6

/** Cell colour by load; the percentage is always printed too. */
function loadClass(percent: number) {
  if (percent > 100) return "bg-danger-soft text-destructive"
  if (percent >= 85) return "bg-warning-soft text-warning-foreground"
  if (percent >= 40) return "bg-success-soft text-success-foreground"
  return "bg-muted/60 text-muted-foreground"
}

export default function WorkloadPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { data: employees = [], isLoading } = useEmployees()
  const { data: tasks = [] } = useTasks()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const holidays = useMemo(() => settings?.holidays.map((h) => h.date) ?? [], [settings])

  const today = todayIso()
  const mondays = useMemo(() => Array.from({ length: WEEKS }, (_, i) => addDays(weekStart(today), i * 7)), [today])
  const people = useMemo(() => employees.filter((e) => e.status !== EmployeeStatus.INACTIVE), [employees])

  const grid = useMemo(
    () =>
      people.map((person) => ({
        person,
        weeks: mondays.map((monday) => {
          const capacity = weeklyCapacity(person, leave, monday, holidays)
          const planned = plannedHours(tasks, person.id, monday, today)
          const off = leaveDays(leave, person.id, monday, addDays(monday, 6)).size
          return { monday, capacity, planned, off, percent: loadPercent(planned, capacity) }
        }),
      })),
    [people, mondays, tasks, leave, holidays, today]
  )

  const thisWeek = grid.map((row) => row.weeks[0]!)
  const overloaded = thisWeek.filter((w) => w.percent > 100).length
  const free = Math.max(0, Math.round(thisWeek.reduce((s, w) => s + Math.max(0, w.capacity - w.planned), 0)))
  const unplanned = tasks.filter((task) => task.status !== TaskStatus.DONE && (!task.assigneeId || !task.dueDate)).length
  const away = thisWeek.filter((w) => w.off > 0).length

  const cards: MetricCardItem[] = [
    { key: "over", title: t("overloadedThisWeek"), value: overloaded, valueClassName: overloaded ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("moreThanCapacity") } },
    { key: "free", title: t("freeCapacity"), value: `${free} h`, valueClassName: "text-success-foreground", footer: { icon: Gauge, text: t("thisWeekAcrossTeam") } },
    { key: "unplanned", title: t("unplannedTasks"), value: unplanned, valueClassName: unplanned ? "text-warning-foreground" : undefined, footer: { icon: Clock, text: t("noAssigneeOrDueDate") } },
    { key: "away", title: t("onLeaveThisWeek"), value: away, valueClassName: "text-info-foreground", footer: { icon: TreePalm, text: t("capacityReduced") } },
  ]

  const weekLabel = (monday: string) =>
    new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${monday}T00:00:00`))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="relative overflow-x-auto rounded-3xl border border-border bg-card p-2 shadow-panel md:p-3">
        <table className="w-full min-w-[52rem] border-separate border-spacing-1.5 text-sm">
          <caption className="sr-only">{t("workloadCaption")}</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-left font-medium">{t("employee")}</th>
              {mondays.map((m, i) => (
                <th key={m} scope="col" className={cn("rounded-xl px-2 py-2 text-center font-medium", i === 0 && "bg-info-soft text-info-foreground")}>
                  {i === 0 ? t("thisWeek") : t("weekOf", { week: weekLabel(m) })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map(({ person, weeks }) => (
              <tr key={person.id}>
                <th scope="row" className="px-3 py-1 text-left font-normal">
                  <span className="flex items-center gap-3">
                    <SpaceAvatar name={person.name} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{person.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{person.jobTitle}</span>
                    </span>
                  </span>
                </th>
                {weeks.map((w) => (
                  <td key={w.monday} className="p-0">
                    <div
                      className={cn("flex h-16 flex-col items-center justify-center rounded-xl px-2 text-center", loadClass(w.percent))}
                      title={t("plannedOfCapacity", { planned: w.planned, capacity: w.capacity })}
                    >
                      <span className="text-sm font-semibold tabular-nums">
                        {Number.isFinite(w.percent) ? `${w.percent}%` : "—"}
                      </span>
                      <span className="text-[11px] tabular-nums opacity-80">
                        {w.planned} / {w.capacity} h
                      </span>
                      {w.off > 0 && (
                        <span className="flex items-center gap-1 text-[11px]">
                          <TreePalm className="size-3" />
                          {t("daysOff", { count: w.off })}
                        </span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {[
          { cls: "bg-muted/60", label: t("loadLight") },
          { cls: "bg-success-soft", label: t("loadHealthy") },
          { cls: "bg-warning-soft", label: t("loadFull") },
          { cls: "bg-danger-soft", label: t("loadOver") },
        ].map((l) => (
          <span key={l.label} className="flex items-center gap-2">
            <span className={cn("size-3 rounded", l.cls)} aria-hidden />
            {l.label}
          </span>
        ))}
        <span>{t("workloadHint")}</span>
      </div>
    </div>
  )
}

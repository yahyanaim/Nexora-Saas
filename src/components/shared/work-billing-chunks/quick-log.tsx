"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { useTimesheetMutations } from "@/hooks/workforce/use-work-billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import type { TimeEntry } from "@/types/work-billing"
import type { WorkProject, WorkTask } from "@/types/work-projects"

const AMOUNTS = [0.5, 1, 2, 4]

/**
 * Phone-friendly logging (TIM-12): tap a recent task, then an amount; the
 * hours land on today's timesheet. Three taps from opening the page.
 */
export function QuickLog({
  employeeId,
  entries,
  projects,
  tasks,
}: {
  employeeId: string
  entries: TimeEntry[]
  projects: WorkProject[]
  tasks: WorkTask[]
}) {
  const t = useTranslations()
  const { addHours } = useTimesheetMutations()
  const [picked, setPicked] = useState<string | null>(null)

  // Most recent distinct project/task rows this person logged on open projects
  const open = new Set(projects.map((p) => p.id))
  const recent: { key: string; projectId: string; taskId?: string }[] = []
  for (const e of [...entries].filter((x) => x.employeeId === employeeId).sort((a, b) => b.date.localeCompare(a.date))) {
    const key = `${e.projectId}:${e.taskId ?? ""}`
    if (open.has(e.projectId) && !recent.some((r) => r.key === key)) recent.push({ key, projectId: e.projectId, taskId: e.taskId })
    if (recent.length === 4) break
  }
  if (recent.length === 0) return null

  const row = recent.find((r) => r.key === picked)
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3" aria-label={t("quickLog")}>
      <p className="text-sm font-medium">{t("quickLogToday")}</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {recent.map((r) => {
          const project = projects.find((p) => p.id === r.projectId)
          const task = tasks.find((x) => x.id === r.taskId)
          return (
            <button
              key={r.key}
              type="button"
              aria-pressed={picked === r.key}
              onClick={() => setPicked(picked === r.key ? null : r.key)}
              className={cn(
                "min-h-14 rounded-2xl border px-3 py-2 text-left text-sm transition-colors",
                picked === r.key ? "border-primary bg-info-soft" : "border-border hover:bg-muted"
              )}
            >
              <span className="block truncate font-medium">{project?.code} · {project?.name}</span>
              <span className="block truncate text-xs text-muted-foreground">{task?.title ?? t("noSpecificTask")}</span>
            </button>
          )
        })}
      </div>
      {row && (
        <div className="grid grid-cols-4 gap-2">
          {AMOUNTS.map((hours) => (
            <button
              key={hours}
              type="button"
              disabled={addHours.isPending}
              onClick={() =>
                addHours.mutate(
                  { employeeId, projectId: row.projectId, taskId: row.taskId, date: todayIso(), hours },
                  { onSuccess: () => setPicked(null) }
                )
              }
              className="h-12 rounded-2xl bg-primary text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              +{hours} h
            </button>
          ))}
        </div>
      )}
    </section>
  )
}

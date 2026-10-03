"use client"

import { useTranslations } from "next-intl"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Badge } from "@/components/ui/badge"
import { isTaskOverdue, remainingHours } from "@/lib/workforce/project-metrics"
import type { Employee } from "@/types/workforce"
import { TaskStatus, type WorkTask } from "@/types/work-projects"

interface Props {
  team: Employee[]
  managerId?: string
  tasks: WorkTask[]
}

/** Who works on the project, with their open work on it. */
export function TeamPanel({ team, managerId, tasks }: Props) {
  const t = useTranslations()
  const unassigned = tasks.filter((task) => !task.assigneeId && task.status !== TaskStatus.DONE).length

  return (
    <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{t("team")}</h2>
        {unassigned > 0 && (
          <Badge variant="outline" className="bg-warning-soft text-warning-foreground border-transparent">
            {t("unassignedTasks", { count: unassigned })}
          </Badge>
        )}
      </header>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {team.map((person) => {
          const own = tasks.filter((task) => task.assigneeId === person.id)
          const open = own.filter((task) => task.status !== TaskStatus.DONE)
          const overdue = own.filter((task) => isTaskOverdue(task)).length
          return (
            <li key={person.id} className="flex items-center gap-3 rounded-2xl border border-border p-3.5">
              <SpaceAvatar name={person.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 truncate text-sm font-medium">
                  {person.name}
                  {person.id === managerId && (
                    <Badge variant="outline" className="font-normal">
                      {t("projectManager")}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">{person.jobTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("openTasksHours", { count: open.length, hours: remainingHours(own) })}
                  {overdue > 0 && <span className="text-destructive"> · {t("overdueCount", { count: overdue })}</span>}
                </p>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

"use client"

import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Calendar, CheckCircle2 } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import type { Client, Employee } from "@/types/workforce"
import { ProjectHealth, type WorkProject } from "@/types/work-projects"
import {
  HEALTH_BAR,
  HEALTH_CLASS,
  HEALTH_LABEL,
  PROJECT_STATUS_CLASS,
  PROJECT_STATUS_LABEL,
  formatShortDate,
} from "./project-labels"

export interface ProjectStats {
  progress: number
  health: ProjectHealth
  total: number
  done: number
  overdue: number
}

interface Props {
  project: WorkProject
  stats: ProjectStats
  client?: Client
  members: Employee[]
}

/** One project in the grid: status, health, progress and the people on it. */
export function ProjectCard({ project, stats, client, members }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const shown = members.slice(0, 3)

  return (
    <Link
      href={`/dashboard/projects/${project.id}`}
      className="group flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-panel transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">{project.code}</p>
          <h2 className="truncate text-base font-semibold text-foreground group-hover:text-primary">{project.name}</h2>
          <p className="truncate text-sm text-muted-foreground">{client?.name ?? t("internalProject")}</p>
        </div>
        <Badge variant="outline" className={cn("shrink-0", PROJECT_STATUS_CLASS[project.status])}>
          {t(PROJECT_STATUS_LABEL[project.status])}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-sm">
          <Badge variant="outline" className={HEALTH_CLASS[stats.health]}>
            {t(HEALTH_LABEL[stats.health])}
          </Badge>
          <span className="font-semibold tabular-nums">{stats.progress}%</span>
        </div>
        <Progress
          value={stats.progress}
          aria-label={t("progress")}
          className={cn("h-2", HEALTH_BAR[stats.health])}
        />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="size-3.5" />
          {t("tasksDone", { done: stats.done, total: stats.total })}
        </span>
        <span className={cn("flex items-center gap-1.5", stats.health === ProjectHealth.LATE && "text-destructive")}>
          <Calendar className="size-3.5" />
          {formatShortDate(project.dueDate, locale)}
        </span>
        <span className="flex gap-1" aria-label={t("teamCount", { count: members.length })}>
          {shown.map((m) => (
            <SpaceAvatar key={m.id} name={m.name} size="xs" className="text-[10px]" />
          ))}
          {members.length > shown.length && (
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">
              +{members.length - shown.length}
            </span>
          )}
        </span>
      </div>
    </Link>
  )
}

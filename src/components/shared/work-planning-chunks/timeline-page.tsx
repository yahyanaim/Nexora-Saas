"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, FolderKanban } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { addDays } from "@/lib/workforce/billing"
import { MilestoneState, milestoneState, projectStatsById, todayIso } from "@/lib/workforce/project-metrics"
import { ProjectHealth, WorkProjectStatus } from "@/types/work-projects"
import { HEALTH_CLASS, HEALTH_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"

const MONTHS = 6

const BAR: Record<ProjectHealth, { track: string; fill: string }> = {
  [ProjectHealth.ON_TRACK]: { track: "bg-primary/15", fill: "bg-primary" },
  [ProjectHealth.AT_RISK]: { track: "bg-warning-soft", fill: "bg-warning-foreground" },
  [ProjectHealth.LATE]: { track: "bg-danger-soft", fill: "bg-destructive" },
  [ProjectHealth.DONE]: { track: "bg-muted", fill: "bg-muted-foreground/50" },
}

function monthStart(iso: string, delta = 0) {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00`)
  d.setMonth(d.getMonth() + delta)
  return todayIso(d)
}

function days(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** Gantt-style view of every project between its start and due date. */
export default function TimelinePage() {
  const t = useTranslations()
  const locale = useLocale()
  const { data: projects = [], isLoading } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: milestones = [] } = useMilestones()
  const { data: clients = [] } = useClients()

  const today = todayIso()
  const [windowStart, setWindowStart] = useState(() => monthStart(today, -1))
  const windowEnd = addDays(monthStart(windowStart, MONTHS), -1)
  const span = days(windowStart, windowEnd) + 1
  const pct = (iso: string) => Math.min(100, Math.max(0, (days(windowStart, iso) / span) * 100))

  const stats = useMemo(() => projectStatsById(projects, tasks), [projects, tasks])
  const rows = useMemo(
    () =>
      projects
        .filter((p) => p.status !== WorkProjectStatus.CANCELLED)
        .sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [projects]
  )
  const months = Array.from({ length: MONTHS }, (_, i) => monthStart(windowStart, i))
  const todayInView = today >= windowStart && today <= windowEnd

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
            <Button variant="ghost" size="sm" aria-label={t("earlier")} onClick={() => setWindowStart(monthStart(windowStart, -1))}>
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-48 text-center text-sm font-medium">
              {formatShortDate(windowStart, locale)} – {formatShortDate(windowEnd, locale)}
            </span>
            <Button variant="ghost" size="sm" aria-label={t("later")} onClick={() => setWindowStart(monthStart(windowStart, 1))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
          {windowStart !== monthStart(today, -1) && (
            <Button variant="outline" size="sm" onClick={() => setWindowStart(monthStart(today, -1))}>
              {t("today")}
            </Button>
          )}
        </div>
      </PageHeader>

      <section className="relative overflow-x-auto rounded-3xl border border-border bg-card p-3 shadow-panel md:p-4">
        <div className="min-w-[52rem]">
          {/* Month header */}
          <div className="grid grid-cols-[16rem_1fr] text-xs font-medium text-muted-foreground">
            <div className="px-2 py-2">{t("project")}</div>
            <div className="relative h-8">
              {months.map((m) => (
                <span
                  key={m}
                  className="absolute top-0 flex h-full items-center border-s border-border ps-2 capitalize"
                  style={{ insetInlineStart: `${pct(m)}%` }}
                >
                  {new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit" }).format(new Date(`${m}T00:00:00`))}
                </span>
              ))}
            </div>
          </div>

          {!isLoading && rows.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <FolderKanban className="size-4" />
              {t("noProjectsYet")}
            </p>
          )}

          <ul className="flex flex-col">
            {rows.map((project) => {
              const s = stats.get(project.id)!
              const end = project.dueDate ?? addDays(project.startDate, 30)
              const visible = project.startDate <= windowEnd && end >= windowStart
              const left = pct(project.startDate)
              const width = Math.max(1.5, pct(end) - left)
              const bar = BAR[s.health]
              return (
                <li key={project.id} className="grid grid-cols-[16rem_1fr] items-center border-t border-border py-2.5">
                  <Link href={`/dashboard/projects/${project.id}`} className="min-w-0 px-2 hover:text-primary">
                    <span className="block truncate text-sm font-medium">{project.name}</span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      {project.code} · {clients.find((c) => c.id === project.clientId)?.name ?? t("internalProject")}
                    </span>
                  </Link>
                  <div className="relative h-9">
                    {months.map((m) => (
                      <span key={m} className="absolute inset-y-0 border-s border-border/60" style={{ insetInlineStart: `${pct(m)}%` }} aria-hidden />
                    ))}
                    {visible && (
                      <Link
                        href={`/dashboard/projects/${project.id}`}
                        title={`${project.name}: ${formatShortDate(project.startDate, locale)} – ${formatShortDate(project.dueDate, locale)} · ${s.progress}%`}
                        className={cn("absolute top-1.5 flex h-6 items-center overflow-hidden rounded-full", bar.track, !project.dueDate && "border border-dashed border-border")}
                        style={{ insetInlineStart: `${left}%`, width: `${width}%` }}
                      >
                        <span className={cn("h-full rounded-full", bar.fill)} style={{ width: `${s.progress}%` }} />
                        <span className="sr-only">{t(HEALTH_LABEL[s.health])}, {s.progress}%</span>
                      </Link>
                    )}
                    {milestones
                      .filter((m) => m.projectId === project.id && m.dueDate >= windowStart && m.dueDate <= windowEnd)
                      .map((m) => {
                        const reached = milestoneState(m, tasks) === MilestoneState.REACHED
                        return (
                          <span
                            key={m.id}
                            title={`${m.title} · ${formatShortDate(m.dueDate, locale)}`}
                            className={cn(
                              "absolute top-2.5 size-4 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-card shadow-sm rtl:translate-x-1/2",
                              reached ? "bg-success-foreground" : "bg-foreground"
                            )}
                            style={{ insetInlineStart: `${pct(m.dueDate)}%` }}
                          >
                            <span className="sr-only">{m.title}</span>
                          </span>
                        )
                      })}
                    {todayInView && (
                      <span className="absolute inset-y-0 w-0.5 bg-destructive/70" style={{ insetInlineStart: `${pct(today)}%` }} aria-hidden />
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {[ProjectHealth.ON_TRACK, ProjectHealth.AT_RISK, ProjectHealth.LATE, ProjectHealth.DONE].map((h) => (
          <Badge key={h} variant="outline" className={HEALTH_CLASS[h]}>{t(HEALTH_LABEL[h])}</Badge>
        ))}
        <span className="flex items-center gap-2"><span className="size-3 rotate-45 rounded-[2px] bg-foreground" aria-hidden />{t("milestone")}</span>
        <span className="flex items-center gap-2"><span className="h-3 w-0.5 bg-destructive/70" aria-hidden />{t("today")}</span>
        <span>{t("timelineHint")}</span>
      </div>
    </div>
  )
}

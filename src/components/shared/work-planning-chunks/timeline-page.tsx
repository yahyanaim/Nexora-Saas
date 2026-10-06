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
import { MilestoneState, milestoneState, projectStatsById, todayIso, calendarIso } from "@/lib/workforce/project-metrics"
import { ProjectHealth, WorkProjectStatus } from "@/types/work-projects"
import { HEALTH_CLASS, HEALTH_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"

const MONTHS = 6

/** Same health colours as before: solid bar, soft icon circle, and the dot in the status pill. */
const BAR: Record<ProjectHealth, { fill: string; soft: string; icon: string; dot: string }> = {
  [ProjectHealth.ON_TRACK]: { fill: "bg-primary", soft: "bg-primary/15", icon: "text-primary", dot: "bg-primary" },
  [ProjectHealth.AT_RISK]: { fill: "bg-warning-foreground", soft: "bg-warning-soft", icon: "text-warning-foreground", dot: "bg-warning-foreground" },
  [ProjectHealth.LATE]: { fill: "bg-destructive", soft: "bg-danger-soft", icon: "text-destructive", dot: "bg-destructive" },
  [ProjectHealth.DONE]: { fill: "bg-muted-foreground/50", soft: "bg-muted", icon: "text-muted-foreground", dot: "bg-muted-foreground" },
}

function monthStart(iso: string, delta = 0) {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00`)
  d.setMonth(d.getMonth() + delta)
  return calendarIso(d)
}

function days(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000)
}

/** Columns are half months (1st and 16th), like the time slots of a schedule. */
const GAP = 6
const HATCH = "repeating-linear-gradient(135deg, var(--border) 0 1.5px, transparent 1.5px 7px)"

/** CSS offset of a fractional column position inside a grid with gaps. */
function colOffset(pos: number, count: number) {
  return `calc(${pos / count} * (100% - ${(count - 1) * GAP}px) + ${Math.min(Math.floor(pos), count - 1) * GAP}px)`
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
  const slots = months.flatMap((m) => [m, `${m.slice(0, 8)}16`])
  const slotEnd = (i: number) => (i + 1 < slots.length ? slots[i + 1]! : addDays(windowEnd, 1))
  /** Fractional column position of a date (0 = window start, slots.length = window end). */
  const pos = (iso: string) => {
    if (iso <= windowStart) return 0
    if (iso > windowEnd) return slots.length
    const i = slots.findLastIndex((x) => x <= iso)
    return i + days(slots[i]!, iso) / days(slots[i]!, slotEnd(i))
  }
  const todaySlot = slots.findLastIndex((x) => x <= today)

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

      <section className="relative overflow-x-auto rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="min-w-[60rem]">
          {/* Column header: one chip per half month, the current one highlighted */}
          <div className="grid grid-cols-[15rem_1fr] items-center gap-3 pb-3">
            <div className="ps-1 text-sm font-medium text-muted-foreground">{t("project")}</div>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`, gap: GAP }}>
              {slots.map((slot, i) => {
                const current = todayInView && i === todaySlot
                const past = slotEnd(i) <= today
                return (
                  <span
                    key={slot}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center rounded-xl border text-center leading-tight",
                      current ? "border-primary bg-primary text-primary-foreground shadow-sm" : past ? "border-transparent bg-muted text-muted-foreground" : "border-border bg-card text-foreground"
                    )}
                  >
                    <span className={cn("text-[10px] capitalize", current ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(`${slot}T00:00:00`))}
                    </span>
                    <span className="text-sm font-medium tabular-nums">{slot.slice(8)}</span>
                  </span>
                )
              })}
            </div>
          </div>

          {!isLoading && rows.length === 0 && (
            <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <FolderKanban className="size-4" />
              {t("noProjectsYet")}
            </p>
          )}

          <div className="relative">
            {/* The "now" line runs through every row, behind the bars */}
            {todayInView && rows.length > 0 && (
              <div className="pointer-events-none absolute -top-3 bottom-0 end-0 start-[calc(15rem+0.75rem)]" aria-hidden>
                <span className="absolute inset-y-0 border-s-2 border-dashed border-primary" style={{ insetInlineStart: colOffset(pos(today), slots.length) }} />
              </div>
            )}

            <ul className="relative flex flex-col gap-2.5">
              {rows.map((project) => {
                const s = stats.get(project.id)!
                const end = project.dueDate ?? addDays(project.startDate, 30)
                const visible = project.startDate <= windowEnd && end >= windowStart
                const from = pos(project.startDate)
                const to = Math.max(from + 0.25, pos(addDays(end, 1)))
                const bar = BAR[s.health]
                const client = clients.find((c) => c.id === project.clientId)?.name ?? t("internalProject")
                return (
                  <li key={project.id} className="grid grid-cols-[15rem_1fr] items-center gap-3">
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary/40"
                    >
                      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", bar.soft)}>
                        <FolderKanban className={cn("size-4", bar.icon)} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{project.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{project.code} · {client}</span>
                      </span>
                    </Link>
                    <div className="relative h-[3.6rem]">
                      {/* Cells: elapsed half months are hatched tiles */}
                      <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${slots.length}, minmax(0, 1fr))`, gap: GAP }} aria-hidden>
                        {slots.map((slot, i) => (
                          <span
                            key={slot}
                            className={cn("rounded-xl", slotEnd(i) <= today ? "border border-border/70" : "")}
                            style={slotEnd(i) <= today ? { backgroundImage: HATCH } : undefined}
                          />
                        ))}
                      </div>
                      {visible && (
                        <Link
                          href={`/dashboard/projects/${project.id}`}
                          title={`${project.name}: ${formatShortDate(project.startDate, locale)} – ${formatShortDate(project.dueDate, locale)} · ${s.progress}%`}
                          className={cn(
                            "@container absolute inset-y-0 flex items-center overflow-hidden rounded-2xl shadow-md ring-4 ring-card transition-shadow hover:shadow-lg",
                            bar.fill,
                            !project.dueDate && "outline-2 outline-dashed outline-offset-2 outline-border"
                          )}
                          style={{ insetInlineStart: colOffset(from, slots.length), width: `calc(${colOffset(to, slots.length)} - ${colOffset(from, slots.length)})` }}
                        >
                          {/* Progress: a thin strip along the bottom of the bar */}
                          <span className="absolute inset-x-3 bottom-1.5 h-[3px] overflow-hidden rounded-full bg-white/35" aria-hidden>
                            <span className="block h-full rounded-full bg-white" style={{ width: `${s.progress}%` }} />
                          </span>
                          <span className="relative flex min-w-0 flex-1 items-center gap-2.5 px-2 pb-1">
                            <span className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-card shadow-sm @[4.5rem]:flex">
                              <FolderKanban className={cn("size-4", bar.icon)} />
                            </span>
                            <span className="hidden min-w-0 flex-1 truncate text-sm font-medium text-white @[9rem]:block">{project.name}</span>
                            <span className="ms-auto hidden shrink-0 items-center gap-1.5 rounded-full bg-card px-2 py-0.5 text-[11px] font-medium text-foreground shadow-sm @[16rem]:flex">
                              <span className={cn("size-1.5 rounded-full", bar.dot)} aria-hidden />
                              {t(HEALTH_LABEL[s.health])} · {s.progress}%
                            </span>
                          </span>
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
                                "absolute -bottom-1.5 size-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-card shadow-sm rtl:translate-x-1/2",
                                reached ? "bg-success-foreground" : "bg-foreground"
                              )}
                              style={{ insetInlineStart: colOffset(pos(m.dueDate), slots.length) }}
                            >
                              <span className="sr-only">{m.title}</span>
                            </span>
                          )
                        })}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {[ProjectHealth.ON_TRACK, ProjectHealth.AT_RISK, ProjectHealth.LATE, ProjectHealth.DONE].map((h) => (
          <Badge key={h} variant="outline" className={HEALTH_CLASS[h]}>{t(HEALTH_LABEL[h])}</Badge>
        ))}
        <span className="flex items-center gap-2"><span className="size-3 rotate-45 rounded-[2px] bg-foreground" aria-hidden />{t("milestone")}</span>
        <span className="flex items-center gap-2"><span className="h-3 border-s-2 border-dashed border-primary" aria-hidden />{t("today")}</span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] border border-border" style={{ backgroundImage: HATCH }} aria-hidden />
          {t("timelineElapsed")}
        </span>
        <span>{t("timelineHint")}</span>
      </div>
    </div>
  )
}

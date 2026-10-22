"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { dependencyIssues, shiftedDates, taskSpan } from "@/lib/workforce/scheduling"
import { TaskStatus, type Milestone, type WorkProject, type WorkTask, isClosedStatus } from "@/types/work-projects"
import type { Employee } from "@/types/workforce"
import { TASK_STATUS_LABEL, TASK_STATUS_TONE } from "./project-labels"
import { TONE_BORDER, TONE_SOFT, TONE_SOLID } from "@/components/ui/status-pill"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { taskKey } from "@/lib/workforce/task-extras"
import type { TaskLabel } from "@/types/work-settings"
import { TaskTypeMark } from "./task-visuals"

const DAY = 30 // px per day
const ROW = 44

/** Share of a task done, shown as the filled part of its bar: done is full, otherwise its subtasks. */
function doneShare(task: WorkTask) {
  if (task.status === TaskStatus.DONE) return 100
  if (!task.subtasks.length) return 0
  return Math.round((task.subtasks.filter((s) => s.done).length / task.subtasks.length) * 100)
}

function days(from: string, to: string) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

interface Props {
  project: WorkProject
  tasks: WorkTask[]
  milestones: Milestone[]
  team: Employee[]
  canEdit: boolean
  /** Workspace labels, for the task type marks */
  labels?: TaskLabel[]
  onOpen: (task: WorkTask) => void
  onReschedule: (taskId: string, dates: { startDate: string; dueDate: string }) => void
}

/**
 * Gantt chart of a project's tasks (PLN-2): bars from start to due date,
 * finish-to-start arrows, milestones and today. Drag a bar to reschedule it.
 */
export function ProjectGantt({ project, tasks, milestones, team, canEdit, labels = [], onOpen, onReschedule }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const [drag, setDrag] = useState<{ id: string; x: number; delta: number } | null>(null)
  const moved = useRef(false)

  const rows = useMemo(
    () =>
      tasks
        .map((task) => ({ task, ...taskSpan(task, project.startDate) }))
        .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end)),
    [tasks, project.startDate]
  )
  const first = [project.startDate, ...rows.map((r) => r.start)].sort()[0]!
  const lastCandidates = [project.dueDate ?? project.startDate, ...rows.map((r) => r.end), ...milestones.map((m) => m.dueDate)].sort()
  // A few days of margin on both sides; weeks start on Monday
  const startDay = (() => {
    const d = new Date(`${addDays(first, -3)}T00:00:00Z`)
    return addDays(addDays(first, -3), -((d.getUTCDay() + 6) % 7))
  })()
  const total = days(startDay, lastCandidates[lastCandidates.length - 1]!) + 10
  const x = (iso: string) => days(startDay, iso) * DAY
  const weeks = Array.from({ length: Math.ceil(total / 7) }, (_, i) => addDays(startDay, i * 7))
  const indexOf = new Map(rows.map((r, i) => [r.task.id, i]))
  // Open the chart around today rather than at the project start
  const scroller = useRef<HTMLDivElement>(null)
  const todayX = today >= startDay ? x(today) : 0
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, todayX - 7 * DAY)
  }, [todayX])
  // Month bands above the weeks
  const months = (() => {
    const out: { key: string; left: number; width: number; label: string }[] = []
    for (let i = 0; i < total; i++) {
      const d = addDays(startDay, i)
      const key = d.slice(0, 7)
      const last = out[out.length - 1]
      if (last?.key === key) last.width += DAY
      else out.push({ key, left: i * DAY, width: DAY, label: new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${d}T00:00:00`)) })
    }
    return out
  })()
  const milestoneTone = (m: Milestone) => (m.approvedAt ? "bg-success" : m.dueDate < today ? "bg-destructive" : "bg-warning")
  const fmt = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${iso}T00:00:00`))

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (!canEdit) return
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    moved.current = false
    setDrag({ id, x: e.clientX, delta: 0 })
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const delta = Math.round((e.clientX - drag.x) / DAY)
    if (delta !== drag.delta) {
      moved.current = true
      setDrag({ ...drag, delta })
    }
  }
  const onPointerUp = (task: WorkTask) => {
    if (drag && drag.delta !== 0) onReschedule(task.id, shiftedDates(task, project.startDate, drag.delta))
    setDrag(null)
  }

  if (rows.length === 0) return <p className="rounded-3xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t("ganttEmpty")}</p>

  return (
    <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <p className="mb-3 text-sm text-muted-foreground">{canEdit ? t("ganttHint") : t("ganttHintReadOnly")}</p>
      <div className="flex overflow-hidden rounded-2xl border border-border">
        {/* Task names */}
        <div className="w-60 shrink-0 border-e border-border bg-muted/30 md:w-72">
          <div className="flex h-12 items-end border-b border-border px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("task")}</div>
          <div className="flex h-8 items-center border-b border-border px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{t("milestones")}</div>
          {rows.map(({ task }) => {
            const issues = dependencyIssues(task, tasks, project.startDate, today).filter((i) => i.kind !== "waiting")
            const who = team.find((e) => e.id === task.assigneeId)
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onOpen(task)}
                className="flex w-full items-center gap-2 border-b border-border px-3 text-start text-sm hover:bg-muted/60"
                style={{ height: ROW }}
                title={issues.map((i) => t(i.kind === "late" ? "depLate" : "depOverlaps", { task: i.predecessor.title })).join("\n") || undefined}
              >
                <TaskTypeMark task={task} labels={labels} />
                <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground md:inline">{taskKey(task, project)}</span>
                <span className={cn("min-w-0 flex-1 truncate", isClosedStatus(task.status) && "text-muted-foreground")}>{task.title}</span>
                {issues.length > 0 && <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-label={t("depIssue")} />}
                {who ? <SpaceAvatar name={who.name} size="xs" /> : <span className="size-5 shrink-0 rounded-full border border-dashed border-border-strong" aria-hidden />}
              </button>
            )
          })}
        </div>

        {/* Chart */}
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: total * DAY }}>
            {/* Week header */}
            <div className="relative h-12 border-b border-border">
              {months.map((m) => (
                <div key={m.key} className="absolute top-0 flex h-6 items-center truncate border-s border-border px-2 text-[11px] font-semibold capitalize text-foreground" style={{ left: m.left, width: m.width }}>
                  {m.label}
                </div>
              ))}
              {weeks.map((w) => (
                <div key={w} className="absolute bottom-0 flex h-6 items-center border-s border-border/70 px-1.5 text-[11px] tabular-nums text-muted-foreground" style={{ left: x(w), width: 7 * DAY }}>
                  {fmt(w)}
                </div>
              ))}
            </div>
            {/* Milestones row */}
            <div className="relative h-8 border-b border-border">
              {today >= startDay && (
                <span className="absolute top-1.5 z-20 -translate-x-1/2 rounded-full bg-primary px-1.5 py-px text-[10px] font-semibold text-primary-foreground shadow-sm" style={{ left: x(today) + DAY / 2 }}>
                  {t("today")}
                </span>
              )}
              {milestones.map((m) => (
                <span key={m.id} className="absolute top-0 flex h-8 items-center gap-1.5" style={{ left: x(m.dueDate) + DAY / 2 - 7 }} title={`${m.title} · ${fmt(m.dueDate)}`}>
                  <span className={cn("size-3.5 shrink-0 rotate-45 rounded-[3px] ring-2 ring-card", milestoneTone(m))} aria-hidden />
                  <span className="max-w-40 truncate text-[11px] font-medium text-foreground">{m.title}</span>
                </span>
              ))}
            </div>

            <div className="relative" style={{ height: rows.length * ROW }}>
              {/* Weekend shading and week lines */}
              {Array.from({ length: total }, (_, i) => {
                const d = new Date(`${addDays(startDay, i)}T00:00:00Z`).getUTCDay()
                return d === 0 || d === 6 ? <span key={i} className="absolute inset-y-0 bg-muted/50" style={{ left: i * DAY, width: DAY }} aria-hidden /> : null
              })}
              {weeks.map((w) => (
                <span key={w} className="absolute inset-y-0 border-s border-border/70" style={{ left: x(w) }} aria-hidden />
              ))}
              {rows.map((_, i) => (
                <span key={i} className="absolute inset-x-0 border-b border-border/60" style={{ top: (i + 1) * ROW - 1 }} aria-hidden />
              ))}
              {/* Today */}
              {today >= startDay && (
                <span className="absolute inset-y-0 z-10 w-0.5 -translate-x-1/2 bg-primary/70" style={{ left: x(today) + DAY / 2 }} aria-hidden />
              )}

              {/* Dependency arrows: from the end of the predecessor to the start of the task */}
              <svg className="pointer-events-none absolute inset-0 z-10" width={total * DAY} height={rows.length * ROW} aria-hidden>
                <defs>
                  <marker id="gantt-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" className="fill-muted-foreground" />
                  </marker>
                </defs>
                {rows.flatMap(({ task, start }, i) =>
                  (task.dependsOn ?? []).map((pid) => {
                    const j = indexOf.get(pid)
                    if (j === undefined) return null
                    const p = rows[j]!
                    const shiftP = drag?.id === pid ? drag.delta * DAY : 0
                    const shiftT = drag?.id === task.id ? drag.delta * DAY : 0
                    const x1 = x(p.end) + DAY + shiftP
                    const y1 = j * ROW + ROW / 2
                    const x2 = x(start) + shiftT
                    const y2 = i * ROW + ROW / 2
                    const bad = !isClosedStatus(p.task.status) && p.end >= start
                    const mid = Math.max(x1 + 8, Math.min(x2 - 8, x1 + 12))
                    return (
                      <path
                        key={`${pid}-${task.id}`}
                        d={`M${x1},${y1} H${mid} V${y2} H${x2 - 2}`}
                        fill="none"
                        strokeWidth={1.5}
                        className={bad ? "stroke-destructive" : "stroke-muted-foreground"}
                        markerEnd="url(#gantt-arrow)"
                      />
                    )
                  })
                )}
              </svg>

              {/* Bars */}
              {rows.map(({ task, start, end }, i) => {
                const shift = drag?.id === task.id ? drag.delta : 0
                const late = !isClosedStatus(task.status) && end < today
                const tone = TASK_STATUS_TONE[task.status]
                const share = doneShare(task)
                const width = (days(start, end) + 1) * DAY - 4
                return [
                  <button
                    key={task.id}
                    type="button"
                    onPointerDown={(e) => onPointerDown(e, task.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => onPointerUp(task)}
                    onClick={() => !moved.current && onOpen(task)}
                    title={`${task.title}: ${fmt(addDays(start, shift))} – ${fmt(addDays(end, shift))}`}
                    className={cn(
                      "absolute z-20 flex items-center overflow-hidden rounded-md border text-[11px] font-medium shadow-xs transition-shadow hover:shadow-md",
                      TONE_SOFT[tone],
                      TONE_BORDER[tone],
                      late && "ring-2 ring-destructive ring-offset-1 ring-offset-card",
                      canEdit ? "cursor-grab active:cursor-grabbing touch-none" : "cursor-pointer",
                      drag?.id === task.id && "opacity-90 shadow-lg"
                    )}
                    style={{ left: x(start) + shift * DAY + 2, width, top: i * ROW + 9, height: ROW - 18 }}
                  >
                    {/* Done part of the work, as a fill */}
                    <span className={cn("absolute inset-y-0 start-0", TONE_SOLID[tone], "opacity-25")} style={{ width: `${share}%` }} aria-hidden />
                    <span className={cn("absolute inset-y-0 start-0 w-1", TONE_SOLID[tone])} aria-hidden />
                    {width > 90 && (
                      <span className="relative flex min-w-0 items-center gap-1.5 ps-2.5 pe-2">
                        <span className="truncate">{task.title}</span>
                        {share > 0 && share < 100 && <span className="shrink-0 tabular-nums opacity-80">{share}%</span>}
                      </span>
                    )}
                  </button>,
                  // Short bars carry their title beside them
                  width <= 90 && (
                    <span
                      key={`${task.id}-label`}
                      className="pointer-events-none absolute z-20 flex items-center truncate text-[11px] font-medium text-muted-foreground"
                      style={{ left: x(start) + shift * DAY + width + 8, top: i * ROW, height: ROW, maxWidth: 220 }}
                      aria-hidden
                    >
                      {task.title}
                    </span>
                  ),
                ]
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {Object.values(TaskStatus).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-5 rounded-sm border", TONE_SOFT[TASK_STATUS_TONE[s]], TONE_BORDER[TASK_STATUS_TONE[s]])} />
            {t(TASK_STATUS_LABEL[s])}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-3 w-0.5 bg-primary/70" />{t("today")}</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rotate-45 rounded-[2px] bg-warning" />{t("milestones")}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-destructive" />{t("ganttConflict")}</span>
      </div>
    </section>
  )
}

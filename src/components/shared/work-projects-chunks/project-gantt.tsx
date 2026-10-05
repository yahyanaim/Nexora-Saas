"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertTriangle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { dependencyIssues, shiftedDates, taskSpan } from "@/lib/workforce/scheduling"
import { TaskStatus, type Milestone, type WorkProject, type WorkTask } from "@/types/work-projects"
import type { Employee } from "@/types/workforce"
import { TASK_STATUS_LABEL } from "./project-labels"

const DAY = 30 // px per day
const ROW = 44
const BAR: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "bg-muted-foreground/40",
  [TaskStatus.IN_PROGRESS]: "bg-primary",
  [TaskStatus.REVIEW]: "bg-warning-foreground",
  [TaskStatus.DONE]: "bg-success-foreground",
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
  onOpen: (task: WorkTask) => void
  onReschedule: (taskId: string, dates: { startDate: string; dueDate: string }) => void
}

/**
 * Gantt chart of a project's tasks (PLN-2): bars from start to due date,
 * finish-to-start arrows, milestones and today. Drag a bar to reschedule it.
 */
export function ProjectGantt({ project, tasks, milestones, team, canEdit, onOpen, onReschedule }: Props) {
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
        <div className="w-56 shrink-0 border-e border-border bg-muted/30">
          <div className="flex h-12 items-end border-b border-border px-3 pb-1.5 text-xs font-medium text-muted-foreground">{t("task")}</div>
          <div className="h-7 border-b border-border" />
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
                {issues.length > 0 && <AlertTriangle className="size-3.5 shrink-0 text-destructive" aria-label={t("depIssue")} />}
                <span className="min-w-0 flex-1 truncate">{task.title}</span>
                {who && <span className="shrink-0 text-[11px] text-muted-foreground">{who.name.split(" ")[0]}</span>}
              </button>
            )
          })}
        </div>

        {/* Chart */}
        <div ref={scroller} className="min-w-0 flex-1 overflow-x-auto">
          <div className="relative" style={{ width: total * DAY }}>
            {/* Week header */}
            <div className="flex h-12 border-b border-border">
              {weeks.map((w) => (
                <div key={w} className="flex shrink-0 items-end border-s border-border px-1.5 pb-1.5 text-[11px] text-muted-foreground" style={{ width: 7 * DAY }}>
                  {fmt(w)}
                </div>
              ))}
            </div>
            {/* Milestones row */}
            <div className="relative h-7 border-b border-border">
              {milestones.map((m) => (
                <span
                  key={m.id}
                  title={`${m.title} · ${fmt(m.dueDate)}`}
                  className={cn("absolute top-1.5 size-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-card shadow-sm", m.approvedAt ? "bg-success-foreground" : "bg-foreground")}
                  style={{ left: x(m.dueDate) + DAY / 2 }}
                />
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
                <span className="absolute inset-y-0 z-10 border-s-2 border-dashed border-primary" style={{ left: x(today) + DAY / 2 }} aria-hidden />
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
                    const bad = p.task.status !== TaskStatus.DONE && p.end >= start
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
                const late = task.status !== TaskStatus.DONE && end < today
                return (
                  <button
                    key={task.id}
                    type="button"
                    onPointerDown={(e) => onPointerDown(e, task.id)}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => onPointerUp(task)}
                    onClick={() => !moved.current && onOpen(task)}
                    title={`${task.title}: ${fmt(addDays(start, shift))} – ${fmt(addDays(end, shift))}`}
                    className={cn(
                      "absolute z-20 flex items-center overflow-hidden rounded-lg px-2 text-[11px] font-medium text-white shadow-sm transition-shadow hover:shadow-md",
                      BAR[task.status],
                      late && "ring-2 ring-destructive ring-offset-1 ring-offset-card",
                      canEdit ? "cursor-grab active:cursor-grabbing touch-none" : "cursor-pointer",
                      drag?.id === task.id && "opacity-90 shadow-lg"
                    )}
                    style={{ left: x(start) + shift * DAY + 2, width: (days(start, end) + 1) * DAY - 4, top: i * ROW + 8, height: ROW - 16 }}
                  >
                    {days(start, end) >= 1 && <span className="truncate">{task.estimatedHours ? `${task.estimatedHours} h` : ""}</span>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        {Object.values(TaskStatus).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-2.5 w-5 rounded", BAR[s])} />
            {t(TASK_STATUS_LABEL[s])}
          </span>
        ))}
        <span className="flex items-center gap-1.5"><span className="h-3 border-s-2 border-dashed border-primary" />{t("today")}</span>
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-5 bg-destructive" />{t("ganttConflict")}</span>
      </div>
    </section>
  )
}

"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { calendarIso, daysBetween, isTaskOverdue, todayIso } from "@/lib/workforce/project-metrics"
import { isWeekend } from "@/lib/workforce/planning"
import { stateOf } from "@/lib/workforce/task-states"
import { taskKey } from "@/lib/workforce/task-extras"
import { isClosedStatus, type TaskState, type WorkTask } from "@/types/work-projects"
import { TASK_STATUS_TONE, stateLabel } from "./project-labels"
import { TONE_BORDER, TONE_SOFT } from "@/components/ui/status-pill"
import { PriorityMark } from "./task-visuals"

interface Props {
  tasks: WorkTask[]
  states: TaskState[]
  canEdit: boolean
  projectCode: string
  onOpen: (task: WorkTask) => void
  onReschedule: (id: string, dates: { dueDate: string; startDate?: string }) => void
}

const DRAG_TYPE = "application/x-nexora-task"
const MAX_PER_DAY = 3

/** New dates when a task moves to another due day: its start moves by the same number of days (P2). */
export function rescheduled(task: Pick<WorkTask, "startDate" | "dueDate">, dueDate: string): { dueDate: string; startDate?: string } {
  if (!task.startDate) return { dueDate }
  if (!task.dueDate) return { dueDate, startDate: task.startDate > dueDate ? dueDate : task.startDate }
  return { dueDate, startDate: addDays(task.startDate, daysBetween(task.dueDate, dueDate)) }
}

/**
 * The project's tasks on a month calendar by due date (P2). Drag a task to
 * another day to move its due date (its start follows); tasks without a due
 * date wait below and can be dragged onto a day too.
 */
export function TaskCalendar({ tasks, states, canEdit, projectCode, onOpen, onReschedule }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const [month, setMonth] = useState(today.slice(0, 7))
  const [overDay, setOverDay] = useState<string | null>(null)
  const [openDay, setOpenDay] = useState<string | null>(null)

  const first = `${month}-01`
  const days = Array.from({ length: 42 }, (_, i) => addDays(weekStart(first), i))
  const byDay = (d: string) => tasks.filter((x) => x.dueDate === d)
  const undated = tasks.filter((x) => !x.dueDate && !isClosedStatus(x.status))
  const monthDays = days.filter((d) => d.startsWith(month))
  const shiftMonth = (delta: number) => {
    const d = new Date(`${first}T00:00:00`)
    d.setMonth(d.getMonth() + delta)
    setMonth(calendarIso(d).slice(0, 7))
  }
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(`${first}T00:00:00`))
  const weekdayNames = days.slice(0, 7).map((d) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${d}T00:00:00`)))
  const dayLabel = (d: string) => new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d}T00:00:00`))

  const drop = (d: string, e: React.DragEvent) => {
    e.preventDefault()
    setOverDay(null)
    const task = tasks.find((x) => x.id === e.dataTransfer.getData(DRAG_TYPE))
    if (task && task.dueDate !== d) onReschedule(task.id, rescheduled(task, d))
  }

  const chip = (task: WorkTask) => {
    const state = stateOf(task, states)
    const closed = isClosedStatus(task.status)
    const key = taskKey(task, { code: projectCode })
    return (
      <button
        key={task.id}
        type="button"
        draggable={canEdit}
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_TYPE, task.id)
          e.dataTransfer.effectAllowed = "move"
        }}
        onClick={() => onOpen(task)}
        title={`${key} · ${task.title} · ${stateLabel(state, t)}`}
        className={cn(
          "flex w-full min-w-0 items-center gap-1.5 rounded-e-md rounded-s-[2px] border-s-[3px] py-1 pe-1.5 ps-1.5 text-start text-[11px] font-medium leading-none transition-colors hover:brightness-95",
          TONE_SOFT[TASK_STATUS_TONE[state.group]],
          TONE_BORDER[TASK_STATUS_TONE[state.group]],
          canEdit && "cursor-grab active:cursor-grabbing",
          closed && "line-through opacity-70",
          isTaskOverdue(task) && "bg-danger-soft text-danger-foreground border-destructive"
        )}
      >
        <PriorityMark priority={task.priority} className="[&_svg]:size-3" />
        <span className="truncate">{task.title}</span>
        <span className="sr-only">{`, ${stateLabel(state, t)}${isTaskOverdue(task) ? `, ${t("overdue")}` : ""}`}</span>
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
          <Button variant="ghost" size="sm" aria-label={t("previousMonth")} onClick={() => shiftMonth(-1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize" aria-live="polite">{monthLabel}</span>
          <Button variant="ghost" size="sm" aria-label={t("nextMonth")} onClick={() => shiftMonth(1)}>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
        {month !== today.slice(0, 7) && (
          <Button variant="outline" size="sm" onClick={() => setMonth(today.slice(0, 7))}>{t("today")}</Button>
        )}
        {canEdit && <p className="text-xs text-muted-foreground">{t("tcHint")}</p>}
      </div>

      {/* Month grid (tablet and up) */}
      <section aria-label={monthLabel} className="hidden overflow-hidden rounded-3xl border border-border bg-card shadow-panel md:block">
        <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-muted-foreground" aria-hidden>
          {weekdayNames.map((name) => <div key={name} className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider">{name}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const items = byDay(d)
            const inMonth = d.startsWith(month)
            const shown = openDay === d ? items : items.slice(0, MAX_PER_DAY)
            return (
              <div
                key={d}
                role="group"
                aria-label={dayLabel(d)}
                onDragOver={(e) => {
                  if (!canEdit) return
                  e.preventDefault()
                  if (overDay !== d) setOverDay(d)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverDay(null)
                }}
                onDrop={(e) => drop(d, e)}
                className={cn(
                  "flex min-h-28 min-w-0 flex-col gap-1 border-border p-1.5 transition-colors",
                  i % 7 !== 6 && "border-e",
                  i < 35 && "border-b",
                  (!inMonth || isWeekend(d)) && "bg-muted/30",
                  d === today && "bg-info-soft/40",
                  overDay === d && "bg-info-soft/60 ring-2 ring-inset ring-primary/40"
                )}
              >
                <span className={cn("flex size-6 items-center justify-center self-end rounded-full text-xs tabular-nums", d === today ? "bg-primary font-semibold text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/60")} aria-hidden>
                  {Number(d.slice(8))}
                </span>
                {shown.map(chip)}
                {items.length > MAX_PER_DAY && (
                  <button type="button" onClick={() => setOpenDay(openDay === d ? null : d)} aria-expanded={openDay === d} className="px-1.5 text-start text-[11px] text-muted-foreground hover:text-foreground">
                    {openDay === d ? t("tcShowLess") : t("moreCount", { count: items.length - MAX_PER_DAY })}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Agenda (phones) */}
      <section aria-label={monthLabel} className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-4 shadow-panel md:hidden">
        {monthDays.every((d) => byDay(d).length === 0) && <p className="py-6 text-center text-sm text-muted-foreground">{t("nothingThisMonth")}</p>}
        {monthDays.filter((d) => byDay(d).length).map((d) => (
          <div key={d} className="flex flex-col gap-1.5">
            <h3 className={cn("text-xs font-semibold", d === today ? "text-primary" : "text-muted-foreground")}>{dayLabel(d)}</h3>
            {byDay(d).map(chip)}
          </div>
        ))}
      </section>

      {undated.length > 0 && (
        <section aria-labelledby="tc-undated" className="flex flex-col gap-2 rounded-3xl border border-dashed border-border p-4">
          <h3 id="tc-undated" className="text-sm font-semibold">{t("tcUndated", { count: undated.length })}</h3>
          <p className="-mt-1 text-xs text-muted-foreground">{t("tcUndatedHint")}</p>
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">{undated.map(chip)}</div>
        </section>
      )}
    </div>
  )
}

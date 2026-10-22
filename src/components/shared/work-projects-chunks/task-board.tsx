"use client"

import { taskKey, taskPeople } from "@/lib/workforce/task-extras"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { AlertTriangle, Calendar, CheckCircle2, Flag, ListChecks, MoreHorizontal, Plus } from "@/components/ui/carbon/icons"
import { TONE_BORDER, TONE_SOFT } from "@/components/ui/status-pill"
import { PriorityMark, TaskTypeMark } from "./task-visuals"
import { cn } from "@/lib/utils"
import { isTaskOverdue } from "@/lib/workforce/project-metrics"
import type { Employee } from "@/types/workforce"
import type { TaskLabel } from "@/types/work-settings"
import { TaskStatus, isClosedStatus, type Milestone, type TaskState, type WorkTask } from "@/types/work-projects"
import { isCancelledState, stateOf } from "@/lib/workforce/task-states"
import { TASK_STATUS_DOT, TASK_STATUS_TONE, formatShortDate, stateLabel } from "./project-labels"

interface Props {
  tasks: WorkTask[]
  labels: TaskLabel[]
  team: Employee[]
  milestones: Milestone[]
  /** The project's statuses in board order; one column each (P2) */
  states: TaskState[]
  canEdit: boolean
  onOpen: (task: WorkTask) => void
  onAdd: (state: TaskState) => void
  onMove: (taskId: string, state: TaskState, index?: number) => void
  /** Dependency problems per task id, shown as a warning (PRJ-6) */
  warnings?: Record<string, string>
  /** Project code, for the task keys (P1) */
  projectCode?: string
}

const DRAG_TYPE = "application/x-nexora-task"

/**
 * Kanban board. Drag a card onto a column (or onto a card to land before it);
 * each card's menu offers the same moves without a mouse.
 */
export function TaskBoard({ tasks, labels, team, milestones, states, canEdit, onOpen, onAdd, onMove, warnings = {}, projectCode }: Props) {
  const t = useTranslations()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ status: string; index: number } | null>(null)
  const [showCancelled, setShowCancelled] = useState(false)

  const all = states.map((state) => ({
    state,
    status: state.id,
    tasks: tasks.filter((task) => stateOf(task, states).id === state.id).sort((a, b) => a.order - b.order),
  }))
  // Cancelled work is folded away until asked for (P2)
  const cancelledCount = all.filter((c) => isCancelledState(c.state)).reduce((n, c) => n + c.tasks.length, 0)
  const columns = showCancelled ? all : all.filter((c) => !isCancelledState(c.state))

  const drop = (status: string, index: number, e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData(DRAG_TYPE) || dragId
    setOver(null)
    setDragId(null)
    if (!id) return
    const task = tasks.find((x) => x.id === id)
    if (!task) return
    // Dropping a card further down its own column: account for it leaving its old slot
    const col = columns.find((c) => c.status === status)!
    const from = col.tasks.findIndex((x) => x.id === id)
    const target = from !== -1 && from < index ? index - 1 : index
    if (stateOf(task, states).id === status && from === target) return
    onMove(id, col.state, target)
  }

  return (
    <div className="flex flex-col gap-3">
    {cancelledCount > 0 && (
      <button type="button" aria-pressed={showCancelled} onClick={() => setShowCancelled((v) => !v)} className="self-end rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
        {t(showCancelled ? "stHideCancelled" : "stShowCancelled", { count: cancelledCount })}
      </button>
    )}
    <div
      className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(var(--board-cols),minmax(15rem,1fr))] xl:overflow-x-auto xl:pb-1"
      style={{ "--board-cols": columns.length } as React.CSSProperties}
    >
      {columns.map(({ state, status, tasks: columnTasks }) => (
        <section
          key={status}
          aria-label={stateLabel(state, t)}
          onDragOver={(e) => {
            if (!canEdit || !dragId) return
            e.preventDefault()
            if (over?.status !== status) setOver({ status, index: columnTasks.length })
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null)
          }}
          onDrop={(e) => drop(status, over?.status === status ? over.index : columnTasks.length, e)}
          className={cn(
            "flex min-h-40 flex-col gap-2 rounded-2xl border border-border border-t-[3px] bg-muted/50 p-2.5 transition-colors",
            TONE_BORDER[TASK_STATUS_TONE[state.group]],
            over?.status === status && "bg-info-soft/40"
          )}
        >
          <header className="flex items-center justify-between px-1 pt-0.5">
            <h2 className="flex min-w-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="truncate">{stateLabel(state, t)}</span>
              <span className={cn("rounded-full px-1.5 text-[11px] font-semibold tabular-nums", TONE_SOFT[TASK_STATUS_TONE[state.group]])}>
                {columnTasks.length}
              </span>
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={() => onAdd(state)}
                aria-label={t("addTaskTo", { column: stateLabel(state, t) })}
                className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground"
              >
                <Plus className="size-4" />
              </button>
            )}
          </header>

          {columnTasks.map((task, index) => (
            <div key={task.id} className="flex flex-col">
              {over?.status === status && over.index === index && dragId !== task.id && (
                <div className="mb-2 h-1 rounded-full bg-primary/60" aria-hidden />
              )}
              <TaskCard
                task={task}
                people={taskPeople(task).map((id) => team.find((e) => e.id === id)).filter((e): e is Employee => !!e)}
                taskKey={projectCode ? taskKey(task, { code: projectCode }) : ""}
                milestone={milestones.find((m) => m.id === task.milestoneId)}
                labels={labels}
                canEdit={canEdit}
                warning={warnings[task.id]}
                dragging={dragId === task.id}
                onOpen={() => onOpen(task)}
                states={states}
                onMove={(next) => onMove(task.id, next)}
                onDragStart={(e) => {
                  e.dataTransfer.setData(DRAG_TYPE, task.id)
                  e.dataTransfer.effectAllowed = "move"
                  setDragId(task.id)
                }}
                onDragEnd={() => {
                  setDragId(null)
                  setOver(null)
                }}
                onDragOverCard={(e) => {
                  if (!canEdit || !dragId) return
                  e.preventDefault()
                  e.stopPropagation()
                  const rect = e.currentTarget.getBoundingClientRect()
                  const at = e.clientY < rect.top + rect.height / 2 ? index : index + 1
                  if (over?.status !== status || over.index !== at) setOver({ status, index: at })
                }}
              />
            </div>
          ))}
          {over?.status === status && over.index === columnTasks.length && (
            <div className="h-1 rounded-full bg-primary/60" aria-hidden />
          )}

          {columnTasks.length === 0 && over?.status !== status && (
            <p className="rounded-2xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              {canEdit ? t("dropTasksHere") : t("noTasks")}
            </p>
          )}
        </section>
      ))}
    </div>
    </div>
  )
}

interface CardProps {
  task: WorkTask
  /** Main person first, then the others on the task (P1) */
  people: Employee[]
  taskKey: string
  milestone?: Milestone
  labels: TaskLabel[]
  canEdit: boolean
  warning?: string
  dragging: boolean
  states: TaskState[]
  onOpen: () => void
  onMove: (state: TaskState) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOverCard: (e: React.DragEvent<HTMLElement>) => void
}

function TaskCard({ task, people, taskKey: key, milestone, labels, canEdit, warning, dragging, states, onOpen, onMove, onDragStart, onDragEnd, onDragOverCard }: CardProps) {
  const t = useTranslations()
  const locale = useLocale()
  const overdue = isTaskOverdue(task)
  const subDone = task.subtasks.filter((s) => s.done).length
  const labelNames = (task.labelIds ?? []).map((id) => labels.find((l) => l.id === id)?.name).filter((n): n is string => !!n)
  const closed = isClosedStatus(task.status)

  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cn(
        "group relative flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3 shadow-xs transition-[box-shadow,border-color] hover:border-border-strong hover:shadow-md",
        canEdit && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "flex-1 rounded-md text-start text-sm font-medium leading-snug text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            closed && "text-muted-foreground"
          )}
        >
          {task.title}
        </button>
        {warning && (
          <span title={warning} className="mt-0.5 shrink-0">
            <AlertTriangle className="size-4 text-destructive" aria-label={warning} />
          </span>
        )}
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("moveTask", { task: task.title })}
                className="-me-1 -mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground opacity-60 transition hover:bg-muted hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
              >
                <MoreHorizontal className="size-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t("moveTo")}</DropdownMenuLabel>
              {states.filter((s) => s.id !== stateOf(task, states).id).map((s) => (
                <DropdownMenuItem key={s.id} onClick={() => onMove(s)} className="text-sm">
                  <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[s.group])} aria-hidden />
                  {stateLabel(s, t)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {labelNames.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {labelNames.map((name) => (
            <span key={name} className="rounded-md border border-border bg-muted/60 px-1.5 py-px text-[11px] font-medium text-muted-foreground">{name}</span>
          ))}
        </div>
      )}

      {(milestone || task.dueDate || task.subtasks.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {milestone && (
            <span className="flex min-w-0 items-center gap-1.5">
              <Flag className="size-3.5 shrink-0" />
              <span className="truncate">{milestone.title}</span>
            </span>
          )}
          {task.dueDate && (
            <span className={cn("flex items-center gap-1 rounded-md", overdue && "bg-danger-soft px-1.5 py-0.5 font-medium text-danger-foreground")}>
              <Calendar className="size-3.5" />
              {formatShortDate(task.dueDate, locale)}
              {overdue && <span className="sr-only">{t("overdue")}</span>}
            </span>
          )}
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-1 tabular-nums" aria-label={t("subtasksDone", { done: subDone, total: task.subtasks.length })}>
              <ListChecks className="size-3.5" />
              {subDone}/{task.subtasks.length}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5">
          <TaskTypeMark task={task} labels={labels} />
          {key && <span className={cn("truncate font-mono text-[11px] font-medium text-muted-foreground", closed && "line-through")}>{key}</span>}
          {task.status === TaskStatus.DONE && <CheckCircle2 className="size-3.5 shrink-0 text-success-foreground" aria-label={t("done")} />}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <PriorityMark priority={task.priority} />
          {people.length > 0 ? (
            <span className="flex -space-x-1.5 rtl:space-x-reverse" title={people.map((p) => p.name).join(", ")}>
              {people.slice(0, 3).map((p) => (
                <span key={p.id} className="rounded-full ring-2 ring-card">
                  <SpaceAvatar name={p.name} size="xs" />
                </span>
              ))}
              {people.length > 3 && <span className="grid size-5 place-items-center rounded-full bg-muted text-[10px] ring-2 ring-card">+{people.length - 3}</span>}
              <span className="sr-only">{people.map((p) => p.name).join(", ")}</span>
            </span>
          ) : (
            <span className="grid size-5 place-items-center rounded-full border border-dashed border-border-strong" title={t("unassigned")}>
              <span className="sr-only">{t("unassigned")}</span>
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

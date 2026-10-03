"use client"

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
import { Calendar, CheckCircle2, Flag, MoreHorizontal, Plus } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { isTaskOverdue } from "@/lib/workforce/project-metrics"
import type { Employee } from "@/types/workforce"
import { TASK_STATUSES, TaskStatus, type Milestone, type WorkTask } from "@/types/work-projects"
import { PRIORITY_DOT, PRIORITY_LABEL, TASK_STATUS_DOT, TASK_STATUS_LABEL, formatShortDate } from "./project-labels"

interface Props {
  tasks: WorkTask[]
  team: Employee[]
  milestones: Milestone[]
  canEdit: boolean
  onOpen: (task: WorkTask) => void
  onAdd: (status: TaskStatus) => void
  onMove: (taskId: string, status: TaskStatus, index?: number) => void
}

const DRAG_TYPE = "application/x-nexora-task"

/**
 * Kanban board. Drag a card onto a column (or onto a card to land before it);
 * each card's menu offers the same moves without a mouse.
 */
export function TaskBoard({ tasks, team, milestones, canEdit, onOpen, onAdd, onMove }: Props) {
  const t = useTranslations()
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ status: TaskStatus; index: number } | null>(null)

  const columns = TASK_STATUSES.map((status) => ({
    status,
    tasks: tasks.filter((task) => task.status === status).sort((a, b) => a.order - b.order),
  }))

  const drop = (status: TaskStatus, index: number, e: React.DragEvent) => {
    e.preventDefault()
    const id = e.dataTransfer.getData(DRAG_TYPE) || dragId
    setOver(null)
    setDragId(null)
    if (!id) return
    const task = tasks.find((x) => x.id === id)
    if (!task) return
    // Dropping a card further down its own column: account for it leaving its old slot
    const column = columns.find((c) => c.status === status)!.tasks
    const from = column.findIndex((x) => x.id === id)
    const target = from !== -1 && from < index ? index - 1 : index
    if (task.status === status && from === target) return
    onMove(id, status, target)
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map(({ status, tasks: columnTasks }) => (
        <section
          key={status}
          aria-label={t(TASK_STATUS_LABEL[status])}
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
            "flex min-h-40 flex-col gap-2.5 rounded-3xl border border-border bg-muted/50 p-3 transition-colors",
            over?.status === status && "border-primary/40 bg-info-soft/40"
          )}
        >
          <header className="flex items-center justify-between px-1.5 pt-0.5">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[status])} aria-hidden />
              {t(TASK_STATUS_LABEL[status])}
              <span className="rounded-full bg-card px-2 text-xs font-medium text-muted-foreground tabular-nums">
                {columnTasks.length}
              </span>
            </h3>
            {canEdit && (
              <button
                type="button"
                onClick={() => onAdd(status)}
                aria-label={t("addTaskTo", { column: t(TASK_STATUS_LABEL[status]) })}
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
                assignee={team.find((e) => e.id === task.assigneeId)}
                milestone={milestones.find((m) => m.id === task.milestoneId)}
                canEdit={canEdit}
                dragging={dragId === task.id}
                onOpen={() => onOpen(task)}
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
  )
}

interface CardProps {
  task: WorkTask
  assignee?: Employee
  milestone?: Milestone
  canEdit: boolean
  dragging: boolean
  onOpen: () => void
  onMove: (status: TaskStatus) => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOverCard: (e: React.DragEvent<HTMLElement>) => void
}

function TaskCard({ task, assignee, milestone, canEdit, dragging, onOpen, onMove, onDragStart, onDragEnd, onDragOverCard }: CardProps) {
  const t = useTranslations()
  const locale = useLocale()
  const overdue = isTaskOverdue(task)
  const subDone = task.subtasks.filter((s) => s.done).length

  return (
    <article
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOverCard}
      className={cn(
        "group relative flex flex-col gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-xs transition-shadow hover:shadow-md",
        canEdit && "cursor-grab active:cursor-grabbing",
        dragging && "opacity-40"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "flex-1 text-left text-sm font-medium leading-snug text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            task.status === TaskStatus.DONE && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </button>
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
              {TASK_STATUSES.filter((s) => s !== task.status).map((s) => (
                <DropdownMenuItem key={s} onClick={() => onMove(s)} className="text-sm">
                  <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[s])} aria-hidden />
                  {t(TASK_STATUS_LABEL[s])}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {milestone && (
        <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
          <Flag className="size-3.5 shrink-0" />
          {milestone.title}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className={cn("size-2 rounded-full", PRIORITY_DOT[task.priority])} aria-hidden />
          {t(PRIORITY_LABEL[task.priority])}
        </span>
        <div className="flex items-center gap-2.5">
          {task.subtasks.length > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground tabular-nums" aria-label={t("subtasksDone", { done: subDone, total: task.subtasks.length })}>
              <CheckCircle2 className="size-3.5" />
              {subDone}/{task.subtasks.length}
            </span>
          )}
          {task.dueDate && (
            <span className={cn("flex items-center gap-1", overdue ? "font-medium text-destructive" : "text-muted-foreground")}>
              <Calendar className="size-3.5" />
              {formatShortDate(task.dueDate, locale)}
              {overdue && <span className="sr-only">{t("overdue")}</span>}
            </span>
          )}
          {assignee ? (
            <span title={assignee.name}>
              <SpaceAvatar name={assignee.name} size="xs" />
              <span className="sr-only">{assignee.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{t("unassigned")}</span>
          )}
        </div>
      </div>
    </article>
  )
}

"use client"

import { taskKey } from "@/lib/workforce/task-extras"
import { useMemo } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { cn } from "@/lib/utils"
import { isTaskOverdue } from "@/lib/workforce/project-metrics"
import type { Employee } from "@/types/workforce"
import { Priority, isClosedStatus, type Milestone, type TaskState, type WorkTask } from "@/types/work-projects"
import { DEFAULT_TASK_STATES, stateOf } from "@/lib/workforce/task-states"
import { includesFilter } from "../workforce-chunks/workforce-labels"
import { PRIORITY_DOT, PRIORITY_LABEL, TASK_STATUS_DOT, formatShortDate, stateLabel } from "./project-labels"

const PRIORITY_RANK: Record<Priority, number> = {
  [Priority.LOW]: 0,
  [Priority.MEDIUM]: 1,
  [Priority.HIGH]: 2,
  [Priority.URGENT]: 3,
}

interface Props {
  tasks: WorkTask[]
  team: Employee[]
  milestones: Milestone[]
  onOpen: (task: WorkTask) => void
  /** Dependency problems per task id (PRJ-6) */
  warnings?: Record<string, string>
  /** Project code, for the task keys (P1) */
  projectCode?: string
  /** The project's statuses (P2) */
  states?: TaskState[]
}

/** All tasks of a project as a sortable, filterable table. */
export function TaskList({ tasks, team, milestones, onOpen, warnings = {}, projectCode, states = DEFAULT_TASK_STATES }: Props) {
  const t = useTranslations()
  const locale = useLocale()

  const columns = useMemo<ColumnDef<WorkTask>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("task")} />,
        filterFn: (row, _id, value: string) => {
          const q = String(value ?? "").toLowerCase()
          return row.original.title.toLowerCase().includes(q) || (!!projectCode && taskKey(row.original, { code: projectCode }).toLowerCase().includes(q))
        },
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => onOpen(row.original)}
            className={cn(
              "text-left font-medium hover:text-primary",
              isClosedStatus(row.original.status) && "text-muted-foreground line-through"
            )}
          >
            {projectCode && row.original.number && <span className="me-2 font-mono text-xs font-normal text-muted-foreground">{taskKey(row.original, { code: projectCode })}</span>}
            {row.original.title}
            {warnings[row.original.id] && (
              <span className="ms-2 inline-flex rounded-full bg-danger-soft px-1.5 py-0.5 align-middle text-[10px] font-medium text-destructive" title={warnings[row.original.id]}>!</span>
            )}
          </button>
        ),
      },
      {
        id: "status",
        // Sorted and filtered by the project's own status, in board order (P2)
        accessorFn: (task) => stateOf(task, states).id,
        sortingFn: (a, b) => states.indexOf(stateOf(a.original, states)) - states.indexOf(stateOf(b.original, states)),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => {
          const state = stateOf(row.original, states)
          return (
            <span className="flex items-center gap-2 text-sm">
              <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[state.group])} aria-hidden />
              {stateLabel(state, t)}
            </span>
          )
        },
      },
      {
        accessorKey: "priority",
        sortingFn: (a, b) => PRIORITY_RANK[a.original.priority] - PRIORITY_RANK[b.original.priority],
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("priority")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => (
          <span className="flex items-center gap-2 text-sm">
            <span className={cn("size-2 rounded-full", PRIORITY_DOT[row.original.priority])} aria-hidden />
            {t(PRIORITY_LABEL[row.original.priority])}
          </span>
        ),
      },
      {
        id: "assignee",
        accessorFn: (task) => task.assigneeId ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("assignee")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => {
          const person = team.find((e) => e.id === row.original.assigneeId)
          const others = (row.original.collaboratorIds ?? []).filter((id) => id !== row.original.assigneeId).length
          return person ? (
            <span className="flex items-center gap-2 text-sm">
              <SpaceAvatar name={person.name} size="xs" />
              {person.name}
              {others > 0 && <span className="text-xs text-muted-foreground" title={(row.original.collaboratorIds ?? []).map((id) => team.find((e) => e.id === id)?.name).filter(Boolean).join(", ")}>+{others}</span>}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">{t("unassigned")}</span>
          )
        },
      },
      {
        id: "milestone",
        header: () => <span>{t("milestone")}</span>,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {milestones.find((m) => m.id === row.original.milestoneId)?.title ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "dueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("dueDate")} />,
        cell: ({ row }) => (
          <span className={cn("text-sm tabular-nums", isTaskOverdue(row.original) && "font-medium text-destructive")}>
            {formatShortDate(row.original.dueDate, locale)}
            {isTaskOverdue(row.original) && <span className="sr-only"> ({t("overdue")})</span>}
          </span>
        ),
      },
      {
        accessorKey: "estimatedHours",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("estimate")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.estimatedHours} h</span>,
      },
    ],
    [t, locale, team, milestones, onOpen, warnings, projectCode, states]
  )

  return (
    <DataTable
      title={t("tasks")}
      columns={columns}
      data={tasks}
      searchColumnId="title"
      searchPlaceholder={t("searchTasks")}
      exportFilename="tasks"
      filters={[
        { columnId: "status", title: t("status"), options: states.map((s) => ({ label: stateLabel(s, t), value: s.id })) },
        { columnId: "priority", title: t("priority"), options: Object.values(Priority).map((p) => ({ label: t(PRIORITY_LABEL[p]), value: p })) },
        { columnId: "assignee", title: t("assignee"), options: team.map((e) => ({ label: e.name, value: e.id })) },
      ]}
    />
  )
}

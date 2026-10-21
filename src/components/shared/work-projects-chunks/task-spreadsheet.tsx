"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronDown, ChevronRight } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { isTaskOverdue } from "@/lib/workforce/project-metrics"
import { stateOf } from "@/lib/workforce/task-states"
import { taskKey } from "@/lib/workforce/task-extras"
import { GROUP_BYS, NO_VALUE, groupTasks, type GroupBy, type TaskGroup } from "@/lib/workforce/task-grouping"
import type { Employee } from "@/types/workforce"
import type { TaskLabel } from "@/types/work-settings"
import { Priority, isClosedStatus, type Milestone, type TaskState, type WorkTask, type WorkTaskInput } from "@/types/work-projects"
import { NONE } from "../workforce-chunks/workforce-labels"
import { PRIORITY_DOT, PRIORITY_LABEL, TASK_STATUS_DOT, stateLabel } from "./project-labels"

interface Props {
  tasks: WorkTask[]
  states: TaskState[]
  team: Employee[]
  milestones: Milestone[]
  labels: TaskLabel[]
  canEdit: boolean
  projectCode: string
  groupBy: GroupBy
  thenBy: GroupBy
  onGroupChange: (groupBy: GroupBy, thenBy: GroupBy) => void
  onOpen: (task: WorkTask) => void
  onUpdate: (id: string, input: Partial<WorkTaskInput>) => void
}

const PRIORITIES = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]
const COLUMNS = 8

/**
 * Tasks as a spreadsheet (P2): title, status, priority, assignee, milestone,
 * due date and estimate edited right in the cell, grouped and sub-grouped by
 * a field. Text and numbers save when you leave the cell or press Enter.
 */
export function TaskSpreadsheet({ tasks, states, team, milestones, labels, canEdit, projectCode, groupBy, thenBy, onGroupChange, onOpen, onUpdate }: Props) {
  const t = useTranslations()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const groups = groupTasks(tasks, groupBy, thenBy, { states, people: team, milestones, labels })

  const groupName = (by: GroupBy, key: string) => {
    if (by === "status") {
      const s = states.find((x) => x.id === key)
      return s ? stateLabel(s, t) : key
    }
    if (by === "priority") return t(PRIORITY_LABEL[key as Priority])
    if (key === NO_VALUE) return t(by === "assignee" ? "unassigned" : by === "milestone" ? "ssNoMilestone" : "ssNoLabel")
    if (by === "assignee") return team.find((e) => e.id === key)?.name ?? "—"
    if (by === "milestone") return milestones.find((m) => m.id === key)?.title ?? "—"
    return labels.find((l) => l.id === key)?.name ?? "—"
  }
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = new Set(c)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const groupSelect = (id: string, label: string, value: GroupBy, options: GroupBy[], onChange: (v: GroupBy) => void, disabled = false) => (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={(v) => onChange(v as GroupBy)}>
        <SelectTrigger id={id} className="h-9 w-40 bg-card" disabled={disabled}><SelectValue>{t(`ssGroup_${value}`)}</SelectValue></SelectTrigger>
        <SelectContent>{options.map((o) => <SelectItem key={o} value={o}>{t(`ssGroup_${o}`)}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  )

  const header = (g: TaskGroup, by: GroupBy, id: string, depth: number) => {
    const open = !collapsed.has(id)
    const state = by === "status" ? states.find((s) => s.id === g.key) : undefined
    return (
      <tr key={`h-${id}`} className={depth === 0 ? "bg-muted/60" : "bg-muted/25"}>
        <th colSpan={COLUMNS} scope="colgroup" className="px-3 py-1.5 text-start">
          <button type="button" aria-expanded={open} onClick={() => toggle(id)} className={cn("flex items-center gap-2 text-sm font-semibold", depth > 0 && "ps-5 text-[13px] font-medium")}>
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4 rtl:rotate-180" />}
            {state && <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[state.group])} aria-hidden />}
            {by === "priority" && <span className={cn("size-2 rounded-full", PRIORITY_DOT[g.key as Priority])} aria-hidden />}
            {groupName(by, g.key)}
            <span className="rounded-full bg-card px-2 text-xs font-medium text-muted-foreground tabular-nums">{g.tasks.length}</span>
          </button>
        </th>
      </tr>
    )
  }

  // A plain render function, not a nested component, so cells keep their focus when the list re-renders
  const rows = (list: WorkTask[], prefix: string) => list.map((task) => row(task, `${prefix}-${task.id}`))

  function row(task: WorkTask, rowKey: string) {
    const state = stateOf(task, states)
    const closed = isClosedStatus(task.status)
    const key = taskKey(task, { code: projectCode })
    const pick = <V extends string>(label: string, value: V, options: { value: V; label: string; dot?: string }[], onChange: (v: V) => void) => {
      const current = options.find((o) => o.value === value)
      return canEdit ? (
        <Select value={value} onValueChange={(v) => v !== value && onChange(v as V)}>
          <SelectTrigger className="h-8 w-full min-w-28 border-transparent bg-transparent px-2 shadow-none hover:border-border" aria-label={`${label} · ${task.title}`}>
            <SelectValue>
              <span className="flex items-center gap-1.5 truncate">
                {current?.dot && <span className={cn("size-2 shrink-0 rounded-full", current.dot)} aria-hidden />}
                {current?.label}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                <span className="flex items-center gap-1.5">{o.dot && <span className={cn("size-2 rounded-full", o.dot)} aria-hidden />}{o.label}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="flex items-center gap-1.5 px-2 text-sm">{current?.dot && <span className={cn("size-2 rounded-full", current.dot)} aria-hidden />}{current?.label}</span>
      )
    }
    // Text and number cells save on leaving the cell; Enter leaves it, Escape puts the value back
    const commitOnBlur = (save: (v: string) => void, original: string) => ({
      onBlur: (e: React.FocusEvent<HTMLInputElement>) => e.target.value !== original && save(e.target.value),
      onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") {
          e.currentTarget.value = original
          e.currentTarget.blur()
        }
      },
    })
    const cell = "border-b border-border px-1 py-1 align-middle"
    return (
      <tr key={rowKey} className="hover:bg-muted/30">
        <td className={cn(cell, "w-24 px-3")}>
          <button type="button" onClick={() => onOpen(task)} className="font-mono text-xs text-muted-foreground hover:text-primary hover:underline" aria-label={t("ssOpen", { task: task.title })}>
            {key || "—"}
          </button>
        </td>
        <td className={cn(cell, "min-w-56")}>
          {canEdit ? (
            <Input
              key={task.title}
              defaultValue={task.title}
              aria-label={t("ssTitleOf", { task: task.title })}
              className={cn("h-8 border-transparent bg-transparent px-2 shadow-none hover:border-border", closed && "text-muted-foreground line-through")}
              {...commitOnBlur((v) => (v.trim() ? onUpdate(task.id, { title: v.trim() }) : undefined), task.title)}
            />
          ) : (
            <span className={cn("px-2 text-sm font-medium", closed && "text-muted-foreground line-through")}>{task.title}</span>
          )}
        </td>
        <td className={cell}>{pick(t("status"), state.id, states.map((s) => ({ value: s.id, label: stateLabel(s, t), dot: TASK_STATUS_DOT[s.group] })), (id) => onUpdate(task.id, { stateId: id, status: states.find((s) => s.id === id)!.group }))}</td>
        <td className={cell}>{pick(t("priority"), task.priority, PRIORITIES.map((p) => ({ value: p, label: t(PRIORITY_LABEL[p]), dot: PRIORITY_DOT[p] })), (p) => onUpdate(task.id, { priority: p }))}</td>
        <td className={cell}>{pick(t("assignee"), task.assigneeId ?? NONE, [{ value: NONE, label: t("unassigned") }, ...team.map((e) => ({ value: e.id, label: e.name }))], (id) => onUpdate(task.id, { assigneeId: id === NONE ? undefined : id }))}</td>
        <td className={cell}>{pick(t("milestone"), task.milestoneId ?? NONE, [{ value: NONE, label: t("ssNoMilestone") }, ...milestones.map((m) => ({ value: m.id, label: m.title }))], (id) => onUpdate(task.id, { milestoneId: id === NONE ? undefined : id }))}</td>
        <td className={cn(cell, "w-40")}>
          {canEdit ? (
            <Input
              key={task.dueDate ?? ""}
              type="date"
              defaultValue={task.dueDate ?? ""}
              aria-label={t("ssDueOf", { task: task.title })}
              className={cn("h-8 border-transparent bg-transparent px-2 shadow-none hover:border-border", isTaskOverdue(task) && "font-medium text-destructive")}
              {...commitOnBlur((v) => onUpdate(task.id, { dueDate: v || undefined }), task.dueDate ?? "")}
            />
          ) : (
            <span className={cn("px-2 text-sm tabular-nums", isTaskOverdue(task) && "font-medium text-destructive")}>{task.dueDate ?? "—"}</span>
          )}
        </td>
        <td className={cn(cell, "w-28")}>
          {canEdit ? (
            <Input
              key={task.estimatedHours}
              type="number"
              min={0}
              max={1000}
              step={0.25}
              defaultValue={task.estimatedHours}
              aria-label={t("ssEstimateOf", { task: task.title })}
              className="h-8 border-transparent bg-transparent px-2 text-end tabular-nums shadow-none hover:border-border"
              {...commitOnBlur((v) => {
                const n = Number(v)
                if (v !== "" && Number.isFinite(n) && n >= 0 && n <= 1000) onUpdate(task.id, { estimatedHours: n })
              }, String(task.estimatedHours))}
            />
          ) : (
            <span className="block px-2 text-end text-sm tabular-nums">{task.estimatedHours} h</span>
          )}
        </td>
      </tr>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        {groupSelect("ss-group", t("ssGroupBy"), groupBy, GROUP_BYS, (v) => onGroupChange(v, v === "none" || v === thenBy ? "none" : thenBy))}
        {groupSelect("ss-then", t("ssThenBy"), thenBy, GROUP_BYS.filter((o) => o !== groupBy || o === "none"), (v) => onGroupChange(groupBy, v), groupBy === "none")}
        {canEdit && <p className="text-xs text-muted-foreground">{t("ssHint")}</p>}
      </div>
      <div className="overflow-x-auto rounded-3xl border border-border bg-card shadow-panel">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <caption className="sr-only">{t("ssCaption")}</caption>
          <thead>
            <tr className="text-start text-xs text-muted-foreground">
              {["ssKey", "title", "status", "priority", "assignee", "milestone", "dueDate", "estimate"].map((k, i) => (
                <th key={k} scope="col" className={cn("border-b border-border px-3 py-2.5 text-start font-medium", i === COLUMNS - 1 && "text-end")}>{t(k)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr><td colSpan={COLUMNS} className="px-3 py-10 text-center text-sm text-muted-foreground">{t("noTasks")}</td></tr>
            )}
            {groupBy === "none"
              ? rows(tasks, "all")
              : groups.flatMap((g) => {
                  const id = g.key
                  const open = !collapsed.has(id)
                  return [
                    header(g, groupBy, id, 0),
                    ...(!open
                      ? []
                      : g.sub
                        ? g.sub.flatMap((sg) => {
                            const sid = `${id}/${sg.key}`
                            return [header(sg, thenBy, sid, 1), ...(collapsed.has(sid) ? [] : rows(sg.tasks, sid))]
                          })
                        : rows(g.tasks, id)),
                  ]
                })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

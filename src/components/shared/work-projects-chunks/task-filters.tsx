"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "@/components/ui/carbon/icons"
import type { Employee } from "@/types/workforce"
import { Priority, type WorkTask } from "@/types/work-projects"
import type { TaskLabel } from "@/types/work-settings"
import { PRIORITY_LABEL } from "./project-labels"

export interface TaskFilterValues {
  assigneeId: string
  labelId: string
  priority: string
}

export const ALL = "__all__"
const UNASSIGNED = "__unassigned__"
export const NO_FILTERS: TaskFilterValues = { assigneeId: ALL, labelId: ALL, priority: ALL }

export function applyTaskFilters(tasks: WorkTask[], f: TaskFilterValues) {
  return tasks.filter(
    (task) =>
      (f.assigneeId === ALL || (f.assigneeId === UNASSIGNED ? !task.assigneeId : task.assigneeId === f.assigneeId)) &&
      (f.labelId === ALL || (task.labelIds ?? []).includes(f.labelId)) &&
      (f.priority === ALL || task.priority === f.priority)
  )
}

interface SavedView {
  id: string
  name: string
  filters: TaskFilterValues
}

/** Saved views live per user in this browser (PRJ-5); the backend will store them per account. */
function storageKey(userId: string) {
  return `nexora:task-views:${userId}`
}

function readViews(userId: string): SavedView[] {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SavedView[]) : []
  } catch {
    return []
  }
}

function writeViews(userId: string, views: SavedView[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(views))
  } catch {
    // Saving views is a convenience; ignore blocked storage
  }
}

interface Props {
  userId: string
  team: Employee[]
  labels: TaskLabel[]
  value: TaskFilterValues
  onChange: (value: TaskFilterValues) => void
}

/** Assignee, label and priority filters for the board and list, with named saved views. */
export function TaskFilters({ userId, team, labels, value, onChange }: Props) {
  const t = useTranslations()
  const [views, setViews] = useState<SavedView[]>(() => (typeof window === "undefined" ? [] : readViews(userId)))
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const active = value.assigneeId !== ALL || value.labelId !== ALL || value.priority !== ALL

  const save = () => {
    const clean = name.trim()
    if (!clean) return
    const next = [...views.filter((v) => v.name.toLowerCase() !== clean.toLowerCase()), { id: `${Date.now()}`, name: clean, filters: value }]
    setViews(next)
    writeViews(userId, next)
    setNaming(false)
    setName("")
  }
  const removeView = (id: string) => {
    const next = views.filter((v) => v.id !== id)
    setViews(next)
    writeViews(userId, next)
  }

  const select = (key: keyof TaskFilterValues, label: string, options: { value: string; label: string }[]) => (
    <div className="w-full sm:w-44">
      <Select value={value[key]} onValueChange={(v) => onChange({ ...value, [key]: v })}>
        <SelectTrigger className="w-full bg-card" aria-label={label}>
          <SelectValue>{value[key] === ALL ? label : options.find((o) => o.value === value[key])?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{label}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {select("assigneeId", t("allAssignees"), [{ value: UNASSIGNED, label: t("unassigned") }, ...team.map((e) => ({ value: e.id, label: e.name }))])}
        {labels.length > 0 && select("labelId", t("allLabels"), labels.map((l) => ({ value: l.id, label: l.name })))}
        {select("priority", t("allPriorities"), Object.values(Priority).map((p) => ({ value: p, label: t(PRIORITY_LABEL[p]) })))}
        {active && (
          <Button variant="ghost" size="sm" onClick={() => onChange(NO_FILTERS)}>
            {t("clearFilters")}
          </Button>
        )}
        {active && !naming && (
          <Button variant="outline" size="sm" onClick={() => setNaming(true)}>
            {t("saveView")}
          </Button>
        )}
        {naming && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("viewName")} aria-label={t("viewName")} className="h-9 w-40" />
            <Button type="submit" size="sm" disabled={!name.trim()}>{t("save")}</Button>
          </form>
        )}
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("savedViews")}</span>
          {views.map((v) => (
            <span key={v.id} className="flex items-center rounded-full border border-border bg-card">
              <button type="button" onClick={() => onChange(v.filters)} className="h-7 px-3 text-xs font-medium hover:text-primary">
                {v.name}
              </button>
              <button type="button" aria-label={t("delete")} onClick={() => removeView(v.id)} className="pe-2 text-muted-foreground hover:text-foreground">
                <Trash2 className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

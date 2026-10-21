"use client"

import { isOnTask } from "@/lib/workforce/task-extras"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Share2, Trash2, Users } from "@/components/ui/carbon/icons"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import type { Employee } from "@/types/workforce"
import { Priority, type TaskView, type WorkTask } from "@/types/work-projects"
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
      (f.assigneeId === ALL || (f.assigneeId === UNASSIGNED ? !task.assigneeId : isOnTask(task, f.assigneeId))) &&
      (f.labelId === ALL || (task.labelIds ?? []).includes(f.labelId)) &&
      (f.priority === ALL || task.priority === f.priority)
  )
}

interface Props {
  userId: string
  /** Project managers can remove views others shared */
  canManage?: boolean
  /** Saved views of the project: this person's and the shared ones (P2) */
  views?: TaskView[]
  onApplyView?: (view: TaskView) => void
  onSaveView?: (input: { name: string; shared: boolean }, done: () => void) => void
  onShareView?: (view: TaskView, shared: boolean) => void
  onDeleteView?: (view: TaskView) => void
  team: Employee[]
  labels: TaskLabel[]
  value: TaskFilterValues
  onChange: (value: TaskFilterValues) => void
  /** Buttons shown at the end of the filter row (e.g. the statuses editor) */
  extra?: React.ReactNode
}

/** Assignee, label and priority filters for the task screens, with saved views that can be shared (P2). */
export function TaskFilters({ userId, canManage = false, views = [], onApplyView, onSaveView, onShareView, onDeleteView, team, labels, value, onChange, extra }: Props) {
  const t = useTranslations()
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState("")
  const [shared, setShared] = useState(false)
  const active = value.assigneeId !== ALL || value.labelId !== ALL || value.priority !== ALL

  const save = () => {
    if (!name.trim() || !onSaveView) return
    onSaveView({ name: name.trim(), shared }, () => {
      setNaming(false)
      setName("")
      setShared(false)
    })
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
        {onSaveView && !naming && (
          <Button variant="outline" size="sm" onClick={() => setNaming(true)}>
            {t("saveView")}
          </Button>
        )}
        {naming && (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              save()
            }}
          >
            <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t("viewName")} aria-label={t("viewName")} maxLength={40} className="h-9 w-44" />
            <label className="flex items-center gap-1.5 text-xs font-medium">
              <Checkbox checked={shared} onCheckedChange={(v) => setShared(v === true)} />
              {t("vwShareWithTeam")}
            </label>
            <Button type="submit" size="sm" disabled={!name.trim()}>{t("save")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>{t("cancel")}</Button>
          </form>
        )}
        {extra && <div className="ms-auto flex items-center gap-2">{extra}</div>}
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">{t("savedViews")}</span>
          {views.map((v) => {
            const mine = v.ownerId === userId
            return (
              <span key={v.id} className="flex items-center rounded-full border border-border bg-card">
                <button
                  type="button"
                  onClick={() => onApplyView?.(v)}
                  title={v.shared ? t("vwSharedBy", { name: v.ownerName }) : undefined}
                  className="flex h-7 items-center gap-1.5 ps-3 pe-2 text-xs font-medium hover:text-primary"
                >
                  {v.shared && <Users className="size-3 text-muted-foreground" aria-hidden />}
                  {v.name}
                  {v.shared && !mine && <span className="sr-only">{`, ${t("vwSharedBy", { name: v.ownerName })}`}</span>}
                </button>
                {mine && onShareView && (
                  <button
                    type="button"
                    aria-pressed={v.shared}
                    aria-label={t(v.shared ? "vwStopSharing" : "vwShare", { name: v.name })}
                    title={t(v.shared ? "vwStopSharing" : "vwShare", { name: v.name })}
                    onClick={() => onShareView(v, !v.shared)}
                    className={cn("px-1 hover:text-foreground", v.shared ? "text-primary" : "text-muted-foreground")}
                  >
                    <Share2 className="size-3" />
                  </button>
                )}
                {(mine || (canManage && v.shared)) && onDeleteView && (
                  <button type="button" aria-label={t("vwDelete", { name: v.name })} onClick={() => onDeleteView(v)} className="pe-2 ps-1 text-muted-foreground hover:text-foreground">
                    <Trash2 className="size-3" />
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

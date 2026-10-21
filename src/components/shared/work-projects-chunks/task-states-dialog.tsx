"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { createId } from "@/lib/workforce/demo-store"
import { MAX_STATE_NAME, MAX_TASK_STATES } from "@/lib/workforce/task-states"
import { TASK_STATUSES, TaskStatus, type TaskState } from "@/types/work-projects"
import { TASK_STATUS_DOT, TASK_STATUS_LABEL, stateLabel } from "./project-labels"

const GROUP_HINT: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: "stGroupHint_todo",
  [TaskStatus.IN_PROGRESS]: "stGroupHint_in_progress",
  [TaskStatus.REVIEW]: "stGroupHint_review",
  [TaskStatus.DONE]: "stGroupHint_done",
  [TaskStatus.CANCELLED]: "stGroupHint_cancelled",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  states: TaskState[]
  /** How many of the project's tasks sit in a status */
  countOf: (state: TaskState) => number
  saving: boolean
  onSave: (states: TaskState[]) => void
}

/**
 * Edits a project's own task statuses (P2): rename, add, reorder and remove
 * them inside fixed groups. Each group keeps at least one status; tasks in a
 * removed status move to the first status left in its group.
 */
export function TaskStatesDialog({ open, onOpenChange, states, countOf, saving, onSave }: Props) {
  const t = useTranslations()
  const [draft, setDraft] = useState<TaskState[]>(states)
  // A status just added takes the focus, ready to be named
  const [added, setAdded] = useState<string | null>(null)

  const set = (id: string, patch: Partial<TaskState>) => setDraft((d) => d.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  const move = (id: string, by: -1 | 1) =>
    setDraft((d) => {
      const s = d.find((x) => x.id === id)!
      const group = d.filter((x) => x.group === s.group)
      const at = group.indexOf(s)
      const other = group[at + by]
      if (!other) return d
      const i = d.indexOf(s)
      const j = d.indexOf(other)
      const next = [...d]
      next[i] = other
      next[j] = s
      return next
    })
  const remove = (id: string) => setDraft((d) => d.filter((s) => s.id !== id))
  const add = (group: TaskStatus) => {
    const id = createId("st")
    setAdded(id)
    setDraft((d) => [...d, { id, name: "", group }])
  }

  // Names must be unique (a blank name reads as its group's name) and new statuses need one
  const keyOf = (s: TaskState) => (s.name?.trim() || (s.id === s.group ? t(TASK_STATUS_LABEL[s.group]) : "")).toLowerCase()
  const problem = (s: TaskState) => {
    const key = keyOf(s)
    if (!key) return t("stNeedsName")
    if (draft.filter((x) => keyOf(x) === key).length > 1) return t("stSameName")
    return ""
  }
  const invalid = draft.some((s) => problem(s))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("stTitle")}</DialogTitle>
          <DialogDescription>{t("stDescription")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          {TASK_STATUSES.map((group) => {
            const own = draft.filter((s) => s.group === group)
            return (
              <section key={group} aria-labelledby={`st-group-${group}`} className="flex flex-col gap-2">
                <div>
                  <h3 id={`st-group-${group}`} className="flex items-center gap-2 text-sm font-semibold">
                    <span className={cn("size-2 rounded-full", TASK_STATUS_DOT[group])} aria-hidden />
                    {t(TASK_STATUS_LABEL[group])}
                  </h3>
                  <p className="text-xs text-muted-foreground">{t(GROUP_HINT[group])}</p>
                </div>
                <ul className="flex flex-col gap-2">
                  {own.map((s, i) => {
                    const error = problem(s)
                    const label = stateLabel(s, t)
                    const count = countOf(s)
                    return (
                      <li key={s.id} className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Input
                            autoFocus={s.id === added}
                            value={s.name ?? ""}
                            onChange={(e) => set(s.id, { name: e.target.value })}
                            placeholder={s.id === s.group ? t(TASK_STATUS_LABEL[group]) : t("stNamePlaceholder")}
                            maxLength={MAX_STATE_NAME}
                            aria-label={t("stName")}
                            aria-invalid={!!error}
                            aria-describedby={error ? `st-err-${s.id}` : undefined}
                            className="h-9"
                          />
                          <span className="w-16 shrink-0 text-end text-xs text-muted-foreground tabular-nums">{t("stTaskCount", { count })}</span>
                          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === 0} aria-label={t("stMoveUp", { name: label })} onClick={() => move(s.id, -1)}><ArrowUp className="size-3.5" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={i === own.length - 1} aria-label={t("stMoveDown", { name: label })} onClick={() => move(s.id, 1)}><ArrowDown className="size-3.5" /></Button>
                          <Button type="button" variant="ghost" size="icon" className="size-8" disabled={own.length === 1} aria-label={t("stRemove", { name: label })} onClick={() => remove(s.id)}><Trash2 className="size-3.5" /></Button>
                        </div>
                        {error && <p id={`st-err-${s.id}`} className="text-xs text-destructive">{error}</p>}
                      </li>
                    )
                  })}
                </ul>
                <Button type="button" variant="ghost" size="sm" className="self-start" disabled={draft.length >= MAX_TASK_STATES} onClick={() => add(group)}>
                  <Plus className="size-4" />
                  {t("stAdd", { group: t(TASK_STATUS_LABEL[group]) })}
                </Button>
              </section>
            )
          })}
          <p className="text-xs text-muted-foreground">{t("stRemoveHint")}</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => setDraft(TASK_STATUSES.map((group) => ({ id: group, group })))}>{t("stReset")}</Button>
          <Button disabled={invalid || saving} onClick={() => onSave(draft)}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Pencil, Plus, RefreshCw, Trash2 } from "@/components/ui/carbon/icons"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { cn } from "@/lib/utils"
import { useCycleMutations, useCycles } from "@/hooks/workforce/use-cycles"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { addDays } from "@/lib/workforce/billing"
import { MAX_CYCLE_NAME, burndown, cycleCapacity, cycleLength, cycleProgress, cycleState, cycleTasks, followingCycle, nextCycleDates, type CycleState } from "@/lib/workforce/cycles"
import { daysBetween, todayIso } from "@/lib/workforce/project-metrics"
import { projectStates, stateOf } from "@/lib/workforce/task-states"
import { taskKey } from "@/lib/workforce/task-extras"
import { isClosedStatus, type Cycle, type WorkProject, type WorkTask, type WorkTaskInput } from "@/types/work-projects"
import type { Employee } from "@/types/workforce"
import { BurndownChart } from "./burndown-chart"
import { TASK_STATUS_DOT, stateLabel } from "./project-labels"

const STATE_CLASS: Record<CycleState, string> = {
  upcoming: "bg-info-soft text-info-foreground border-transparent",
  active: "bg-success-soft text-success-foreground border-transparent",
  ended: "bg-warning-soft text-warning-foreground border-transparent",
  closed: "bg-muted text-muted-foreground border-transparent",
}

interface Props {
  project: WorkProject
  tasks: WorkTask[]
  team: Employee[]
  canEdit: boolean
  onOpenTask: (task: WorkTask) => void
  onUpdateTask: (id: string, input: Partial<WorkTaskInput>) => void
  onSetEnabled: (enabled: boolean) => void
}

/**
 * Cycles (sprints) of a project (P4), when the project uses them: pick a
 * cycle, follow its burn-down and each person's capacity, plan tasks into it
 * from the backlog, and close it, moving unfinished work on.
 */
export function CyclesPanel({ project, tasks, team, canEdit, onOpenTask, onUpdateTask, onSetEnabled }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const today = todayIso()
  const { data: cycles = [] } = useCycles(project.id)
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const m = useCycleMutations()
  const [picked, setPicked] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<Cycle | "new" | null>(null)
  const [closing, setClosing] = React.useState<Cycle | null>(null)
  const [deleting, setDeleting] = React.useState<Cycle | null>(null)
  const [adding, setAdding] = React.useState(false)

  if (!project.cyclesEnabled) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
        <RefreshCw className="size-7 text-muted-foreground" aria-hidden />
        <h2 className="text-base font-semibold">{t("cyOffTitle")}</h2>
        <p className="max-w-lg text-sm text-muted-foreground">{t("cyOffHint")}</p>
        {canEdit && <Button onClick={() => onSetEnabled(true)}>{t("cyTurnOn")}</Button>}
      </section>
    )
  }

  const states = projectStates(project)
  const fallback = cycles.find((c) => cycleState(c, today) === "active") ?? cycles.find((c) => cycleState(c, today) === "upcoming") ?? cycles.find((c) => cycleState(c, today) === "ended") ?? cycles[cycles.length - 1]
  const cycle = cycles.find((c) => c.id === picked) ?? fallback
  const openCycleIds = new Set(cycles.filter((c) => !c.closedAt).map((c) => c.id))
  const backlog = tasks.filter((x) => !isClosedStatus(x.status) && (!x.cycleId || !openCycleIds.has(x.cycleId)))
  const short = (d: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00`))
  const person = (id?: string) => team.find((e) => e.id === id)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("cyPick")}>
          {cycles.map((c) => {
            const s = cycleState(c, today)
            return (
              <button key={c.id} type="button" aria-pressed={cycle?.id === c.id} onClick={() => setPicked(c.id)} className={cn("flex h-9 items-center gap-2 rounded-full border px-3 text-sm", cycle?.id === c.id ? "border-primary bg-primary/10 font-medium text-primary" : "border-border hover:bg-muted")}>
                {c.name}
                <span className={cn("rounded-full px-1.5 text-[10px] font-medium", STATE_CLASS[s])}>{t(`cyState_${s}`)}</span>
              </button>
            )
          })}
        </div>
        <div className="ms-auto flex gap-2">
          {canEdit && <Button variant="outline" size="sm" onClick={() => setEditing("new")}><Plus className="size-4" /> {t("cyNew")}</Button>}
          {canEdit && <Button variant="ghost" size="sm" onClick={() => onSetEnabled(false)}>{t("cyTurnOff")}</Button>}
        </div>
      </div>

      {!cycle ? (
        <p className="rounded-3xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">{t("cyNone")}</p>
      ) : (
        <CycleView
          key={cycle.id}
          cycle={cycle}
          cycles={cycles}
          tasks={tasks}
          team={team}
          canEdit={canEdit}
          today={today}
          short={short}
          person={person}
          stateText={(task) => {
            const s = stateOf(task, states)
            return <span className="flex items-center gap-1.5"><span className={cn("size-2 rounded-full", TASK_STATUS_DOT[s.group])} aria-hidden />{stateLabel(s, t)}</span>
          }}
          projectCode={project.code}
          capacity={(c, own) => cycleCapacity(c, team, own, leave, (settings?.holidays ?? []).map((h) => h.date))}
          onOpenTask={onOpenTask}
          onRemoveTask={(task) => onUpdateTask(task.id, { cycleId: undefined })}
          onAdd={() => setAdding(true)}
          onEdit={() => setEditing(cycle)}
          onClose={() => setClosing(cycle)}
          onDelete={() => setDeleting(cycle)}
        />
      )}

      <p className="text-xs text-muted-foreground">{t("cyBacklogCount", { count: backlog.length })}</p>

      {editing && (
        <CycleDialog
          projectId={project.id}
          cycle={editing === "new" ? undefined : editing}
          defaults={nextCycleDates(cycles, today)}
          number={cycles.reduce((n, c) => Math.max(n, c.number), 0) + 1}
          saving={m.save.isPending}
          onClose={() => setEditing(null)}
          onSave={(input, id) => m.save.mutate({ input, id }, { onSuccess: (c) => { setPicked(c.id); setEditing(null) } })}
        />
      )}
      {closing && (
        <CloseDialog
          cycle={closing}
          unfinished={cycleTasks(tasks, closing.id).filter((x) => !isClosedStatus(x.status)).length}
          next={followingCycle(cycles, closing)}
          saving={m.close.isPending}
          onClose={() => setClosing(null)}
          onConfirm={(carryTo) => m.close.mutate({ id: closing.id, carryTo }, { onSuccess: () => setClosing(null) })}
        />
      )}
      {adding && cycle && (
        <AddTasksDialog
          cycle={cycle}
          backlog={backlog}
          projectCode={project.code}
          person={person}
          onClose={() => setAdding(false)}
          onAdd={(ids) => {
            ids.forEach((id) => onUpdateTask(id, { cycleId: cycle.id }))
            setAdding(false)
          }}
        />
      )}
      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("cyDeleteTitle")}
        description={t("cyDeleteHint", { name: deleting?.name ?? "" })}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        destructive
        isLoading={m.remove.isPending}
        onConfirm={() => deleting && m.remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setPicked(null) } })}
      />
    </div>
  )
}

function Tile({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

interface ViewProps {
  cycle: Cycle
  cycles: Cycle[]
  tasks: WorkTask[]
  team: Employee[]
  canEdit: boolean
  today: string
  projectCode: string
  short: (d: string) => string
  person: (id?: string) => Employee | undefined
  stateText: (task: WorkTask) => React.ReactNode
  capacity: (c: Cycle, own: WorkTask[]) => ReturnType<typeof cycleCapacity>
  onOpenTask: (task: WorkTask) => void
  onRemoveTask: (task: WorkTask) => void
  onAdd: () => void
  onEdit: () => void
  onClose: () => void
  onDelete: () => void
}

function CycleView({ cycle, tasks, team, canEdit, today, projectCode, short, person, stateText, capacity, onOpenTask, onRemoveTask, onAdd, onEdit, onClose, onDelete }: ViewProps) {
  const t = useTranslations()
  const state = cycleState(cycle, today)
  const own = cycleTasks(tasks, cycle.id)
  const progress = cycleProgress(own)
  const caps = capacity(cycle, own).filter((c) => c.capacityHours > 0 || c.committedHours > 0)
  const when =
    state === "upcoming" ? t("cyStartsIn", { count: daysBetween(today, cycle.startDate) })
    : state === "active" ? t("cyDaysLeft", { count: daysBetween(today, cycle.endDate) + 1 })
    : state === "ended" ? t("cyEndedAgo", { count: daysBetween(cycle.endDate, today) })
    : t("cyClosedBy", { name: cycle.closedBy ?? "—" })

  return (
    <section aria-labelledby={`cy-${cycle.id}`} className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`cy-${cycle.id}`} className="text-lg font-semibold">{cycle.name}</h2>
            <Badge variant="outline" className={STATE_CLASS[state]}>{t(`cyState_${state}`)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{short(cycle.startDate)} → {short(cycle.endDate)} · {t("cyLength", { count: cycleLength(cycle) })} · {when}</p>
          {cycle.goal && <p className="mt-1 text-sm">{t("cyGoalIs", { goal: cycle.goal })}</p>}
        </div>
        {canEdit && !cycle.closedAt && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="size-4" /> {t("edit")}</Button>
            <Button variant="outline" size="sm" onClick={onDelete} aria-label={t("cyDeleteTitle")}><Trash2 className="size-4" /></Button>
            {state !== "upcoming" && <Button size="sm" onClick={onClose}>{t("cyClose")}</Button>}
          </div>
        )}
      </div>

      {cycle.summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Tile label={t("cyCommitted")} value={`${cycle.summary.committedHours} h`} />
          <Tile label={t("cyDone")} value={`${cycle.summary.doneHours} h`} hint={cycle.summary.committedHours ? `${Math.round((cycle.summary.doneHours / cycle.summary.committedHours) * 100)}%` : undefined} />
          <Tile label={t("cyDoneTasks")} value={cycle.summary.doneTasks} />
          <Tile label={t("cyCarried")} value={cycle.summary.carriedTasks} hint={cycle.summary.carriedTasks ? t(cycle.summary.carriedTo === "next" ? "cyCarriedNext" : "cyCarriedBacklog") : undefined} />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile label={t("cyCommitted")} value={`${progress.committedHours} h`} hint={t("cyTaskCount", { count: progress.totalTasks })} />
            <Tile label={t("cyDone")} value={`${progress.doneHours} h`} hint={`${progress.percent}%`} />
            <Tile label={t("cyDoneTasks")} value={`${progress.doneTasks}/${progress.totalTasks}`} />
            <Tile label={t("cyLeft")} value={`${Math.round((progress.committedHours - progress.doneHours) * 10) / 10} h`} />
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <h3 className="mb-2 text-sm font-semibold">{t("cyBurndown")}</h3>
              {own.length ? <BurndownChart points={burndown(cycle, own, today)} today={today} /> : <p className="text-sm text-muted-foreground">{t("cyNoTasks")}</p>}
            </div>
            <div>
              <h3 className="text-sm font-semibold">{t("cyCapacity")}</h3>
              <p className="mb-2 text-xs text-muted-foreground">{t("cyCapacityHint")}</p>
              <ul className="flex flex-col gap-3">
                {caps.length === 0 && <li className="text-sm text-muted-foreground">{t("cyNoCapacity")}</li>}
                {caps.map((c) => {
                  const e = team.find((x) => x.id === c.employeeId)
                  const over = c.load > 100
                  return (
                    <li key={c.employeeId} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm">
                        <SpaceAvatar name={e?.name ?? "?"} size="xs" />
                        <span className="min-w-0 flex-1 truncate">{e?.name}</span>
                        <span className={cn("tabular-nums", over && "font-medium text-destructive")}>{c.committedHours} / {c.capacityHours} h</span>
                      </div>
                      <Progress value={Math.min(100, c.load)} aria-label={c.capacityHours === 0 ? `${e?.name ?? ""}: ${t("cyNoTime")}` : t("cyLoadOf", { name: e?.name ?? "", load: c.load })} className={cn("h-1.5", over && "[&>[data-slot=progress-indicator]]:bg-destructive")} />
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        {over && <AlertTriangle className="size-3 text-destructive" aria-hidden />}
                        {c.capacityHours === 0 ? t("cyNoTime") : over ? t("cyOver", { load: c.load }) : t("cyLoad", { load: c.load })}
                        {c.leaveDays > 0 && ` · ${t("cyLeaveDays", { count: c.leaveDays })}`}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">{t("cyTasks")}</h3>
          {canEdit && !cycle.closedAt && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="size-4" /> {t("cyAddTasks")}</Button>}
        </div>
        {own.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">{t(cycle.closedAt ? "cyClosedEmpty" : "cyNoTasks")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {own.map((task) => (
              <li key={task.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                <button type="button" onClick={() => onOpenTask(task)} className={cn("flex min-w-0 flex-1 items-center gap-2 text-start hover:text-primary", isClosedStatus(task.status) && "text-muted-foreground line-through")}>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{taskKey(task, { code: projectCode })}</span>
                  <span className="truncate">{task.title}</span>
                </button>
                <span className="text-xs text-muted-foreground">{stateText(task)}</span>
                <span className="w-28 truncate text-xs text-muted-foreground">{person(task.assigneeId)?.name ?? t("unassigned")}</span>
                <span className="w-12 text-end text-xs tabular-nums">{task.estimatedHours} h</span>
                {canEdit && !cycle.closedAt && (
                  <Button variant="ghost" size="icon" className="size-7" aria-label={t("cyRemoveTask", { task: task.title })} onClick={() => onRemoveTask(task)}><Trash2 className="size-3.5" /></Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function CycleDialog({ projectId, cycle, defaults, number, saving, onClose, onSave }: { projectId: string; cycle?: Cycle; defaults: { startDate: string; endDate: string }; number: number; saving: boolean; onClose: () => void; onSave: (input: { projectId: string; name: string; startDate: string; endDate: string; goal?: string }, id?: string) => void }) {
  const t = useTranslations()
  const [v, setV] = React.useState({ name: cycle?.name ?? t("cyDefaultName", { number }), startDate: cycle?.startDate ?? defaults.startDate, endDate: cycle?.endDate ?? defaults.endDate, goal: cycle?.goal ?? "" })
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }))
  const length = v.startDate && v.endDate && v.endDate >= v.startDate ? daysBetween(v.startDate, v.endDate) + 1 : 0
  const valid = v.name.trim() && length >= 1 && length <= 28
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cycle ? t("cyEditTitle") : t("cyNewTitle")}</DialogTitle>
          <DialogDescription>{t("cyDialogHint")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) onSave({ projectId, name: v.name, startDate: v.startDate, endDate: v.endDate, goal: v.goal }, cycle?.id) }}>
          <div className="grid gap-1.5">
            <Label htmlFor="cy-name">{t("cyName")}</Label>
            <Input id="cy-name" value={v.name} maxLength={MAX_CYCLE_NAME} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="cy-start">{t("startDate")}</Label>
              <Input id="cy-start" type="date" value={v.startDate} onChange={(e) => set({ startDate: e.target.value, endDate: e.target.value && length ? addDays(e.target.value, length - 1) : v.endDate })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cy-end">{t("dueDate")}</Label>
              <Input id="cy-end" type="date" min={v.startDate} value={v.endDate} onChange={(e) => set({ endDate: e.target.value })} aria-invalid={!length || length > 28} />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("cyQuickLength")}>
            {[7, 14].map((d) => (
              <button key={d} type="button" aria-pressed={length === d} onClick={() => v.startDate && set({ endDate: addDays(v.startDate, d - 1) })} className={cn("h-8 rounded-full border px-3 text-xs font-medium", length === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                {t(d === 7 ? "cyOneWeek" : "cyTwoWeeks")}
              </button>
            ))}
            <span className={cn("text-xs", length > 28 || !length ? "text-destructive" : "text-muted-foreground")}>{length > 28 || !length ? t("cyTooLong") : t("cyLength", { count: length })}</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cy-goal">{t("cyGoal")}</Label>
            <Textarea id="cy-goal" rows={2} value={v.goal} onChange={(e) => set({ goal: e.target.value })} placeholder={t("cyGoalPlaceholder")} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!valid || saving}>{t("save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CloseDialog({ cycle, unfinished, next, saving, onClose, onConfirm }: { cycle: Cycle; unfinished: number; next?: Cycle; saving: boolean; onClose: () => void; onConfirm: (carryTo: "next" | "backlog") => void }) {
  const t = useTranslations()
  const [carryTo, setCarryTo] = React.useState<"next" | "backlog">("next")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("cyCloseTitle", { name: cycle.name })}</DialogTitle>
          <DialogDescription>{unfinished ? t("cyUnfinished", { count: unfinished }) : t("cyAllDone")}</DialogDescription>
        </DialogHeader>
        {unfinished > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">{t("cyMoveThem")}</legend>
            {(["next", "backlog"] as const).map((k) => (
              <label key={k} className={cn("flex cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm", carryTo === k ? "border-primary bg-primary/5" : "border-border")}>
                <input type="radio" name="carry" className="mt-1 accent-primary" checked={carryTo === k} onChange={() => setCarryTo(k)} />
                <span>
                  <span className="font-medium">{k === "next" ? (next ? t("cyToNext", { name: next.name }) : t("cyToNew")) : t("cyToBacklog")}</span>
                  <span className="block text-xs text-muted-foreground">{t(k === "next" ? "cyToNextHint" : "cyToBacklogHint")}</span>
                </span>
              </label>
            ))}
          </fieldset>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={saving} onClick={() => onConfirm(carryTo)}>{t("cyClose")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function AddTasksDialog({ cycle, backlog, projectCode, person, onClose, onAdd }: { cycle: Cycle; backlog: WorkTask[]; projectCode: string; person: (id?: string) => Employee | undefined; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const t = useTranslations()
  const [ids, setIds] = React.useState<string[]>([])
  const hours = backlog.filter((x) => ids.includes(x.id)).reduce((s, x) => s + x.estimatedHours, 0)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("cyAddTitle", { name: cycle.name })}</DialogTitle>
          <DialogDescription>{t("cyAddHint")}</DialogDescription>
        </DialogHeader>
        {backlog.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("cyBacklogEmpty")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {backlog.map((x) => (
              <li key={x.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/40">
                  <Checkbox checked={ids.includes(x.id)} onCheckedChange={(c) => setIds((list) => (c === true ? [...list, x.id] : list.filter((y) => y !== x.id)))} />
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{taskKey(x, { code: projectCode })}</span>
                  <span className="min-w-0 flex-1 truncate">{x.title}</span>
                  <span className="hidden w-28 truncate text-xs text-muted-foreground sm:block">{person(x.assigneeId)?.name ?? t("unassigned")}</span>
                  <span className="w-12 text-end text-xs tabular-nums">{x.estimatedHours} h</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter className="items-center gap-2">
          <span className="me-auto text-xs text-muted-foreground">{t("cySelected", { count: ids.length, hours })}</span>
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!ids.length} onClick={() => onAdd(ids)}>{t("cyAddTasks")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

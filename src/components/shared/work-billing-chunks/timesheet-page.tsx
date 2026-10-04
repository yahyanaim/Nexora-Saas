"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Plus, RotateCcw, Send, Trash2 } from "@/components/ui/carbon/icons"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useLeave } from "@/hooks/workforce/use-leave"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { weeklyCapacity } from "@/lib/workforce/planning"
import { entryDisplayStatus } from "@/lib/workforce/billing"
import { TimerBar } from "./timer-bar"
import { QuickLog } from "./quick-log"
import { PageHeader } from "@/components/shared/page-header"
import { cn } from "@/lib/utils"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries, useTimesheetMutations } from "@/hooks/workforce/use-work-billing"
import { addDays, weekDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { EmployeeStatus } from "@/types/workforce"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { TaskStatus, WorkProjectStatus } from "@/types/work-projects"
import { TIME_STATUS_CELL, TIME_STATUS_CLASS, TIME_STATUS_LABEL, formatHours } from "./billing-labels"

const EDITABLE = [TimeEntryStatus.DRAFT, TimeEntryStatus.REJECTED]
const INVOICED_CLASS = "bg-muted text-foreground border-transparent"
const NO_TASK = "__none__"

interface Row {
  key: string
  projectId: string
  taskId?: string
}

const rowKey = (projectId: string, taskId?: string) => `${projectId}:${taskId ?? ""}`

export default function TimesheetPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: entries = [], isLoading } = useTimeEntries()
  const { setCell, clearRow, submit, reopen, copyWeek } = useTimesheetMutations()
  const { data: leave = [] } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const { authedUser } = useAuthGuard()
  const canApprove = can(authedUser, AdminPermissionsPlatform.TIME_APPROVE)
  const [reopening, setReopening] = useState(false)
  const [reopenReason, setReopenReason] = useState("")

  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE)
  const [pickedEmployeeId, setEmployeeId] = useState<string>("")
  const [monday, setMonday] = useState(() => weekStart(todayIso()))
  // Rows added by hand belong to one person and week; switching either starts clean
  const [added, setAdded] = useState<{ view: string; rows: Row[] }>({ view: "", rows: [] })
  const [newProject, setNewProject] = useState("")
  const [newTask, setNewTask] = useState(NO_TASK)

  // Until someone is picked, show whoever logged time most recently
  const latestLogger = [...entries].reverse().find((e) => staff.some((s) => s.id === e.employeeId))?.employeeId
  const employeeId = pickedEmployeeId || latestLogger || staff[0]?.id || ""
  const view = `${employeeId}:${monday}`
  const extraRows = useMemo(() => (added.view === view ? added.rows : []), [added, view])
  const setExtraRows = (update: (rows: Row[]) => Row[]) => setAdded({ view, rows: update(extraRows) })

  const employee = employees.find((e) => e.id === employeeId)
  const days = weekDays(monday)
  const sunday = days[6]!
  const today = todayIso()

  const weekEntries = useMemo(
    () => entries.filter((e) => e.employeeId === employeeId && e.date >= monday && e.date <= sunday),
    [entries, employeeId, monday, sunday]
  )

  const rows = useMemo(() => {
    const seen = new Map<string, Row>()
    for (const e of weekEntries) seen.set(rowKey(e.projectId, e.taskId), { key: rowKey(e.projectId, e.taskId), projectId: e.projectId, taskId: e.taskId })
    for (const r of extraRows) if (!seen.has(r.key)) seen.set(r.key, r)
    return [...seen.values()]
  }, [weekEntries, extraRows])

  const cellEntry = (row: Row, date: string) =>
    weekEntries.find((e) => e.projectId === row.projectId && (e.taskId ?? "") === (row.taskId ?? "") && e.date === date)

  const myProjects = projects.filter(
    (p) => p.memberIds.includes(employeeId) && p.status !== WorkProjectStatus.CANCELLED && p.status !== WorkProjectStatus.COMPLETED
  )
  const projectTasks = tasks.filter((task) => task.projectId === newProject && task.status !== TaskStatus.DONE)

  const dayTotal = (date: string) => weekEntries.filter((e) => e.date === date).reduce((s, e) => s + e.hours, 0)
  const weekTotal = weekEntries.reduce((s, e) => s + e.hours, 0)
  const editableCount = weekEntries.filter((e) => EDITABLE.includes(e.status)).length
  const rejected = weekEntries.filter((e) => e.status === TimeEntryStatus.REJECTED)
  const statusCounts = [...Object.values(TimeEntryStatus), "invoiced" as const]
    .map((status) => ({ status, count: weekEntries.filter((e) => entryDisplayStatus(e) === status).length }))
    .filter((s) => s.count > 0)
  const reopenable = weekEntries.filter((e) => e.status === TimeEntryStatus.APPROVED && !e.invoiceId)
  // Expected hours: capacity on their working days, minus leave and public holidays (TIM-11)
  const expected = employee ? weeklyCapacity(employee, leave, monday, settings?.holidays.map((h) => h.date) ?? []) : 0
  const gap = Math.round((expected - weekTotal) * 100) / 100

  const addRow = () => {
    if (!newProject) return
    const taskId = newTask === NO_TASK ? undefined : newTask
    setExtraRows((r) => [...r, { key: rowKey(newProject, taskId), projectId: newProject, taskId }])
    setNewProject("")
    setNewTask(NO_TASK)
  }

  const weekLabel = `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${monday}T00:00:00`))} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${sunday}T00:00:00`))}`

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => copyWeek.mutate({ employeeId, monday })} disabled={!employeeId || copyWeek.isPending}>
              <Copy className="size-4" />
              {t("copyLastWeek")}
            </Button>
            {canApprove && reopenable.length > 0 && (
              <Button variant="outline" onClick={() => setReopening(true)}>
                <RotateCcw className="size-4" />
                {t("reopenApproved")}
              </Button>
            )}
            <Button
              onClick={() => submit.mutate({ employeeId, from: monday, to: sunday })}
              disabled={!editableCount || submit.isPending}
            >
              <Send className="size-4" />
              {t("submitWeek")}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-64 bg-card" aria-label={t("employee")}>
                <SelectValue placeholder={t("employee")}>{employee?.name}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
              <Button variant="ghost" size="sm" aria-label={t("previousWeek")} onClick={() => setMonday(addDays(monday, -7))}>
                <ChevronLeft className="size-4" />
              </Button>
              <span className="min-w-44 text-center text-sm font-medium tabular-nums">{weekLabel}</span>
              <Button variant="ghost" size="sm" aria-label={t("nextWeek")} onClick={() => setMonday(addDays(monday, 7))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
            {monday !== weekStart(today) && (
              <Button variant="outline" size="sm" onClick={() => setMonday(weekStart(today))}>
                {t("thisWeek")}
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {statusCounts.map(({ status, count }) => (
              <Badge key={status} variant="outline" className={status === "invoiced" ? INVOICED_CLASS : TIME_STATUS_CLASS[status]}>
                {t(status === "invoiced" ? "invoiced" : TIME_STATUS_LABEL[status])} · {count}
              </Badge>
            ))}
          </div>
        </div>
      </PageHeader>

      {employeeId && (
        <div className="flex flex-col gap-3">
          <QuickLog employeeId={employeeId} entries={entries} projects={myProjects} tasks={tasks} />
          <TimerBar employeeId={employeeId} projects={myProjects} tasks={tasks.filter((x) => x.status !== TaskStatus.DONE)} />
        </div>
      )}

      {rejected.length > 0 && (
        <div role="alert" className="flex gap-3 rounded-2xl border border-destructive/30 bg-danger-soft p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">{t("hoursSentBack")}</p>
            <ul className="mt-1 list-disc ps-4 text-foreground/80">
              {[...new Set(rejected.map((e) => e.rejectionReason).filter(Boolean))].map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <section className="relative overflow-x-auto rounded-3xl border border-border bg-card p-2 shadow-panel md:p-3">
        <table className="w-full min-w-[56rem] border-separate border-spacing-1 text-sm">
          <caption className="sr-only">{t("timesheetFor", { name: employee?.name ?? "", week: weekLabel })}</caption>
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th scope="col" className="px-3 py-2 text-left font-medium">{t("projectAndTask")}</th>
              {days.map((d) => (
                <th
                  key={d}
                  scope="col"
                  className={cn("w-20 rounded-xl px-1 py-2 text-center font-medium", d === today && "bg-info-soft text-info-foreground")}
                >
                  <span className="block">{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(`${d}T00:00:00`))}</span>
                  <span className="block text-[11px] font-normal">{Number(d.slice(8))}</span>
                </th>
              ))}
              <th scope="col" className="w-20 px-2 py-2 text-right font-medium">{t("total")}</th>
              <th scope="col" className="w-10"><span className="sr-only">{t("actions")}</span></th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-muted-foreground">
                  {t("noHoursThisWeek")}
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const project = projects.find((p) => p.id === row.projectId)
              const task = tasks.find((x) => x.id === row.taskId)
              const rowEntries = days.map((d) => cellEntry(row, d))
              const locked = rowEntries.some((e) => e && !EDITABLE.includes(e.status))
              const total = rowEntries.reduce((s, e) => s + (e?.hours ?? 0), 0)
              const label = `${project?.name ?? "—"}${task ? ` · ${task.title}` : ""}`
              return (
                <tr key={row.key}>
                  <th scope="row" className="max-w-72 px-3 py-1.5 text-left font-normal">
                    <span className="block truncate font-medium">{project?.name ?? "—"}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {project?.code}
                      {task ? ` · ${task.title}` : ""}
                    </span>
                  </th>
                  {days.map((d, i) => (
                    <td key={d} className="p-0">
                      <HoursCell
                        key={`${rowEntries[i]?.hours ?? 0}:${rowEntries[i]?.status ?? ""}`}
                        entry={rowEntries[i]}
                        label={t("hoursOn", { row: label, date: d })}
                        disabled={!employeeId}
                        onCommit={(hours) => setCell.mutate({ employeeId, projectId: row.projectId, taskId: row.taskId, date: d, hours })}
                      />
                    </td>
                  ))}
                  <td className="px-2 text-right font-medium tabular-nums">{formatHours(total)}</td>
                  <td>
                    {!locked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={t("removeRow", { row: label })}
                        onClick={() => {
                          setExtraRows((r) => r.filter((x) => x.key !== row.key))
                          if (rowEntries.some(Boolean)) clearRow.mutate({ employeeId, projectId: row.projectId, taskId: row.taskId, dates: days })
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="text-xs">
              <th scope="row" className="px-3 py-2 text-left font-medium text-muted-foreground">{t("dailyTotal")}</th>
              {days.map((d) => (
                <td key={d} className={cn("text-center font-medium tabular-nums", dayTotal(d) > 10 && "text-warning-foreground")}>
                  {dayTotal(d) ? formatHours(dayTotal(d)) : "—"}
                </td>
              ))}
              <td className="px-2 text-right text-sm font-semibold tabular-nums">{formatHours(weekTotal)}</td>
              <td />
            </tr>
            {employee && (
              <tr>
                <td colSpan={10} className="px-3 pt-1 text-xs text-muted-foreground">
                  {t("expectedHours", { hours: Math.round(weekTotal * 100) / 100, expected })}
                  {gap > 0 && <span className="ms-2 font-medium text-warning-foreground">{t("hoursMissing", { hours: gap })}</span>}
                </td>
              </tr>
            )}
          </tfoot>
        </table>

        <div className="mt-2 flex flex-col gap-2 border-t border-border p-3 sm:flex-row sm:items-center">
          <Select value={newProject} onValueChange={(v) => { setNewProject(v); setNewTask(NO_TASK) }}>
            <SelectTrigger className="bg-card sm:w-72" aria-label={t("project")}>
              <SelectValue placeholder={t("chooseProject")}>{projects.find((p) => p.id === newProject)?.name}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {myProjects.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{t("notOnAnyProject")}</div>}
              {myProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={newTask} onValueChange={setNewTask}>
            <SelectTrigger className="bg-card sm:w-64" aria-label={t("task")} disabled={!newProject}>
              <SelectValue>{newTask === NO_TASK ? t("noSpecificTask") : tasks.find((x) => x.id === newTask)?.title}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TASK}>{t("noSpecificTask")}</SelectItem>
              {projectTasks.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  {task.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={addRow} disabled={!newProject}>
            <Plus className="size-4" />
            {t("addRow")}
          </Button>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">{t("timesheetHint")} {t("quarterHourHint")}</p>

      <Dialog open={reopening} onOpenChange={setReopening}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reopenApproved")}</DialogTitle>
            <DialogDescription>{t("reopenHint", { count: reopenable.length })}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reopenReason} onChange={(e) => setReopenReason(e.target.value)} placeholder={t("reason")} aria-label={t("reason")} />
          <DialogFooter>
            <Button
              disabled={!reopenReason.trim() || reopen.isPending}
              onClick={() =>
                reopen.mutate(
                  { ids: reopenable.map((e) => e.id), reason: reopenReason },
                  { onSuccess: () => { setReopening(false); setReopenReason("") } }
                )
              }
            >
              {t("reopen")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** One day's hours. Saves when the value changes and focus leaves; locked once submitted. */
function HoursCell({
  entry,
  label,
  disabled,
  onCommit,
}: {
  entry?: TimeEntry
  label: string
  disabled?: boolean
  onCommit: (hours: number) => void
}) {
  const t = useTranslations()
  const saved = entry?.hours ?? 0
  // The parent keys this cell by its saved value, so a save or refetch resets the text
  const [value, setValue] = useState(saved ? String(saved) : "")

  const locked = !!entry && !EDITABLE.includes(entry.status)
  const commit = () => {
    const hours = value.trim() === "" ? 0 : Number(value.replace(",", "."))
    if (!Number.isFinite(hours) || hours < 0) {
      setValue(saved ? String(saved) : "")
      return
    }
    if (hours !== saved) onCommit(hours)
  }

  return (
    <Input
      inputMode="decimal"
      aria-label={entry ? `${label} (${t(entry.invoiceId ? "invoiced" : TIME_STATUS_LABEL[entry.status])})` : label}
      title={entry?.rejectionReason}
      value={value}
      disabled={disabled || locked}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur()
        if (e.key === "Escape") setValue(saved ? String(saved) : "")
      }}
      placeholder="–"
      className={cn(
        "h-10 rounded-xl text-center tabular-nums disabled:opacity-100",
        entry && (entry.invoiceId ? "bg-muted" : TIME_STATUS_CELL[entry.status])
      )}
    />
  )
}

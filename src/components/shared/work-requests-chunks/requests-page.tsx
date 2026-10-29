"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, BadgeCheck, Clock, Copy, InboxIcon, Plus, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClientRequestMutations, useClientRequests } from "@/hooks/workforce/use-client-requests"
import { useChangeOrders } from "@/hooks/workforce/use-change-orders"
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { can } from "@/lib/permissions/can"
import { addDays } from "@/lib/workforce/billing"
import { MAX_REQUEST_DETAILS, MAX_REQUEST_TITLE, requestAgeDays, requestState } from "@/lib/workforce/client-requests"
import { todayIso } from "@/lib/workforce/project-metrics"
import { taskKey } from "@/lib/workforce/task-extras"
import { cn } from "@/lib/utils"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import { Priority, WorkProjectStatus, isClosedStatus } from "@/types/work-projects"
import { RequestKind, RequestStatus, type ClientRequest } from "@/types/work-requests"
import { ClientStatus } from "@/types/workforce"
import { PRIORITY_LABEL } from "../work-projects-chunks/project-labels"
import { KIND_ICON } from "../work-portal-chunks/portal-requests"

type Tab = "open" | "snoozed" | "answered"
const TABS: Tab[] = ["open", "snoozed", "answered"]
const ALL = "__all__"
const NONE = "__none__"
const PRIORITIES = [Priority.URGENT, Priority.HIGH, Priority.MEDIUM, Priority.LOW]

const pill = (on: boolean) =>
  cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors", on ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")

type Dialogs =
  | { kind: "accept"; request: ClientRequest }
  | { kind: "reject"; request: ClientRequest }
  | { kind: "snooze"; request: ClientRequest }
  | { kind: "duplicate"; request: ClientRequest }
  | { kind: "log" }
  | null

/**
 * The team's inbox of client requests (P3): accept one as a task (and bill
 * it with a change order when it is outside the scope), decline it with a
 * reason the client sees, snooze it to a later day, or mark it as already
 * planned.
 */
export default function RequestsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const canEdit = can(authedUser, P.PROJECTS_UPDATE)
  const today = todayIso()
  const { data: requests = [], isLoading } = useClientRequests()
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: changes = [] } = useChangeOrders()
  const m = useClientRequestMutations()
  const [tab, setTab] = React.useState<Tab>("open")
  const [clientFilter, setClientFilter] = React.useState(ALL)
  const [query, setQuery] = React.useState("")
  const [dialog, setDialog] = React.useState<Dialogs>(null)

  const stateOf = (r: ClientRequest) => requestState(r, today)
  const tabOf = (r: ClientRequest): Tab => (stateOf(r) === RequestStatus.NEW ? "open" : stateOf(r) === RequestStatus.SNOOZED ? "snoozed" : "answered")
  const counts = Object.fromEntries(TABS.map((x) => [x, requests.filter((r) => tabOf(r) === x).length])) as Record<Tab, number>
  const q = query.trim().toLowerCase()
  const shown = requests
    .filter((r) => tabOf(r) === tab && (clientFilter === ALL || r.clientId === clientFilter))
    .filter((r) => !q || `${r.number} ${r.title} ${r.description ?? ""} ${r.requestedBy}`.toLowerCase().includes(q))
    // Urgent first among the requests to answer, then the oldest
    .sort((a, b) => (tab === "open" ? Number(b.urgent) - Number(a.urgent) || a.createdAt.localeCompare(b.createdAt) : (b.decidedAt ?? b.createdAt).localeCompare(a.decidedAt ?? a.createdAt)))

  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—"
  const project = (id?: string) => projects.find((p) => p.id === id)
  const keyOf = (taskId?: string) => {
    const task = tasks.find((x) => x.id === taskId)
    return task ? { task, key: taskKey(task, project(task.projectId)) || task.title } : undefined
  }
  const answered30 = requests.filter((r) => r.decidedAt && r.status !== RequestStatus.SNOOZED && r.decidedAt.slice(0, 10) >= addDays(today, -30)).length
  const cards: MetricCardItem[] = [
    { key: "open", title: t("rqTileOpen"), value: counts.open, valueClassName: counts.open ? "text-primary" : undefined, footer: { icon: InboxIcon, text: t("rqTileOpenHint") } },
    { key: "urgent", title: t("rqTileUrgent"), value: requests.filter((r) => tabOf(r) === "open" && r.urgent).length, valueClassName: requests.some((r) => tabOf(r) === "open" && r.urgent) ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("rqTileUrgentHint") } },
    { key: "snoozed", title: t("rqTileSnoozed"), value: counts.snoozed, footer: { icon: Clock, text: t("rqTileSnoozedHint") } },
    { key: "answered", title: t("rqTileAnswered"), value: answered30, footer: { icon: BadgeCheck, text: t("rqTileAnsweredHint") } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={canEdit && (
          <Button onClick={() => setDialog({ kind: "log" })}>
            <Plus className="size-4" /> {t("rqLog")}
          </Button>
        )}
      />
      <MetricCardGrid cards={cards} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("rqShow")}>
            {TABS.map((x) => (
              <button key={x} type="button" aria-pressed={tab === x} onClick={() => setTab(x)} className={pill(tab === x)}>
                {t(`rqTab_${x}`)} <span className="tabular-nums">{counts[x]}</span>
              </button>
            ))}
          </div>
          <div className="ms-auto flex flex-wrap gap-2">
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="h-9 w-44 bg-card" aria-label={t("client")}><SelectValue>{clientFilter === ALL ? t("allClients") : clientName(clientFilter)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("allClients")}</SelectItem>
                {clients.filter((c) => requests.some((r) => r.clientId === c.id)).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("rqSearch")} aria-label={t("rqSearch")} className="h-9 w-48" />
          </div>
        </div>

        {isLoading ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState icon={InboxIcon} title={t(`rqEmpty_${tab}`)} />
        ) : (
          <ul className="flex flex-col gap-3">
            {shown.map((r) => {
              const Icon = KIND_ICON[r.kind]
              const state = stateOf(r)
              const p = project(r.projectId)
              const age = requestAgeDays(r, today)
              const task = keyOf(r.taskId ?? r.duplicateOfTaskId)
              const co = changes.find((o) => o.id === r.changeOrderId)
              return (
                <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4 md:flex-row md:items-start">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted" aria-hidden><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-medium">{r.title}</h2>
                      {r.urgent && <Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">{t("rqUrgent")}</Badge>}
                      {r.status === RequestStatus.SNOOZED && state === RequestStatus.NEW && <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("rqBackFromSnooze")}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {r.number} · {t(`rqKind_${r.kind}`)} · {clientName(r.clientId)}{p ? ` · ${p.code}` : ` · ${t("rqNoProject")}`} · {r.loggedByTeam ? t("rqLoggedBy", { name: r.requestedBy }) : r.requestedBy} · {age === 0 ? t("rqToday") : t("rqDaysAgo", { count: age })}
                    </p>
                    {r.description && <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-muted-foreground">{r.description}</p>}
                    {state === RequestStatus.SNOOZED && r.snoozedUntil && <p className="mt-2 text-xs text-muted-foreground">{t("rqBackOn", { date: new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${r.snoozedUntil}T00:00:00`)) })}</p>}
                    {state === RequestStatus.REJECTED && r.reason && <p className="mt-2 rounded-lg bg-muted px-2 py-1 text-xs">{t("rqDeclinedBecause", { reason: r.reason })}</p>}
                    {(state === RequestStatus.ACCEPTED || state === RequestStatus.DUPLICATE) && task && (
                      <p className="mt-2 text-xs">
                        {t(state === RequestStatus.ACCEPTED ? "rqBecameTask" : "rqCoveredBy")}{" "}
                        <Link href={`/dashboard/projects/${task.task.projectId}?task=${task.task.id}`} className="font-medium text-primary hover:underline">{task.key} · {task.task.title}</Link>
                        {co && <span className="text-muted-foreground"> · {t("rqWithChange", { number: co.number })}</span>}
                      </p>
                    )}
                    {r.decidedBy && state !== RequestStatus.NEW && <p className="mt-1 text-xs text-muted-foreground">{t("rqDecidedBy", { name: r.decidedBy })}</p>}
                  </div>
                  {canEdit && (
                    <div className="flex flex-wrap gap-1.5 md:shrink-0 md:flex-nowrap md:justify-end">
                      {(state === RequestStatus.NEW || state === RequestStatus.SNOOZED) && (
                        <>
                          <Button size="sm" onClick={() => setDialog({ kind: "accept", request: r })}><BadgeCheck className="size-4" /> {t("rqAccept")}</Button>
                          {state === RequestStatus.NEW && <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "snooze", request: r })}><Clock className="size-4" /> {t("rqSnooze")}</Button>}
                          <Button size="sm" variant="outline" onClick={() => setDialog({ kind: "duplicate", request: r })}><Copy className="size-4" /> {t("rqDuplicate")}</Button>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDialog({ kind: "reject", request: r })}><XCircle className="size-4" /> {t("rqDecline")}</Button>
                        </>
                      )}
                      {(state === RequestStatus.SNOOZED || state === RequestStatus.REJECTED || state === RequestStatus.DUPLICATE) && (
                        <Button size="sm" variant="ghost" disabled={m.reopen.isPending} onClick={() => m.reopen.mutate(r.id)}>{t(state === RequestStatus.SNOOZED ? "rqBringBack" : "rqReopen")}</Button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {dialog?.kind === "accept" && <AcceptDialog request={dialog.request} onClose={() => setDialog(null)} />}
      {dialog?.kind === "reject" && <RejectDialog request={dialog.request} onClose={() => setDialog(null)} />}
      {dialog?.kind === "snooze" && <SnoozeDialog request={dialog.request} onClose={() => setDialog(null)} />}
      {dialog?.kind === "duplicate" && <DuplicateDialog request={dialog.request} onClose={() => setDialog(null)} />}
      {dialog?.kind === "log" && <LogDialog clients={clients.filter((c) => c.status !== ClientStatus.ARCHIVED)} onClose={() => setDialog(null)} />}
    </div>
  )
}

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

/** The client's open projects, for accepting or logging a request. */
function useOpenProjects(clientId: string) {
  const { data: projects = [] } = useProjects()
  return projects.filter((p) => p.clientId === clientId && p.status !== WorkProjectStatus.COMPLETED && p.status !== WorkProjectStatus.CANCELLED)
}

function AcceptDialog({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const t = useTranslations()
  const { accept } = useClientRequestMutations()
  const open = useOpenProjects(request.clientId)
  const { data: employees = [] } = useEmployees()
  const { data: milestones = [] } = useMilestones()
  const [v, setV] = React.useState({
    projectId: open.some((p) => p.id === request.projectId) ? request.projectId! : (open[0]?.id ?? ""),
    title: request.title,
    assigneeId: NONE,
    priority: request.urgent ? Priority.URGENT : Priority.MEDIUM,
    dueDate: "",
    estimatedHours: "4",
    outOfScope: request.kind === RequestKind.CHANGE,
    amount: "",
    hours: "",
    milestoneId: NONE,
  })
  const project = open.find((p) => p.id === v.projectId)
  const team = employees.filter((e) => project?.memberIds.includes(e.id))
  const phases = milestones.filter((x) => x.projectId === v.projectId)
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }))
  const valid = !!project && v.title.trim().length > 0 && (!v.outOfScope || Number(v.amount) > 0)
  const submit = () =>
    accept.mutate(
      {
        id: request.id,
        input: {
          projectId: v.projectId,
          title: v.title,
          assigneeId: v.assigneeId === NONE ? undefined : v.assigneeId,
          priority: v.priority,
          dueDate: v.dueDate || undefined,
          estimatedHours: Number(v.estimatedHours) || 0,
          changeOrder: v.outOfScope ? { amount: Number(v.amount), hours: Number(v.hours) || 0, milestoneId: v.milestoneId === NONE ? undefined : v.milestoneId } : undefined,
        },
      },
      { onSuccess: onClose }
    )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("rqAcceptTitle")}</DialogTitle>
          <DialogDescription>{`${request.number} · ${request.title}`}</DialogDescription>
        </DialogHeader>
        {open.length === 0 ? (
          <p className="rounded-xl bg-warning-soft p-3 text-sm text-warning-foreground">{t("rqNoOpenProject")}</p>
        ) : (
          <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); if (valid) submit() }}>
            <Field id="acc-project" label={t("project")}>
              <Select value={v.projectId} onValueChange={(projectId) => set({ projectId, assigneeId: NONE, milestoneId: NONE })}>
                <SelectTrigger id="acc-project" className="w-full"><SelectValue>{project ? `${project.code} · ${project.name}` : ""}</SelectValue></SelectTrigger>
                <SelectContent>{open.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="acc-title" label={t("rqTaskTitle")}>
              <Input id="acc-title" value={v.title} onChange={(e) => set({ title: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="acc-assignee" label={t("assignee")}>
                <Select value={v.assigneeId} onValueChange={(assigneeId) => set({ assigneeId })}>
                  <SelectTrigger id="acc-assignee" className="w-full"><SelectValue>{v.assigneeId === NONE ? t("unassigned") : team.find((e) => e.id === v.assigneeId)?.name}</SelectValue></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t("unassigned")}</SelectItem>
                    {team.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field id="acc-priority" label={t("priority")}>
                <Select value={v.priority} onValueChange={(p) => set({ priority: p as Priority })}>
                  <SelectTrigger id="acc-priority" className="w-full"><SelectValue>{t(PRIORITY_LABEL[v.priority])}</SelectValue></SelectTrigger>
                  <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{t(PRIORITY_LABEL[p])}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field id="acc-due" label={t("dueDate")}>
                <Input id="acc-due" type="date" value={v.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
              </Field>
              <Field id="acc-estimate" label={t("rqEstimateHours")}>
                <Input id="acc-estimate" type="number" min={0} step={0.25} value={v.estimatedHours} onChange={(e) => set({ estimatedHours: e.target.value })} />
              </Field>
            </div>
            <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <Checkbox checked={v.outOfScope} onCheckedChange={(c) => set({ outOfScope: c === true })} className="mt-0.5" />
              <span>
                <span className="font-medium">{t("rqOutOfScope")}</span>
                <span className="block text-xs text-muted-foreground">{t("rqOutOfScopeHint")}</span>
              </span>
            </label>
            {v.outOfScope && (
              <div className="grid gap-4 sm:grid-cols-3">
                <Field id="acc-amount" label={t("rqChangeAmount")}>
                  <Input id="acc-amount" type="number" min={0} value={v.amount} onChange={(e) => set({ amount: e.target.value })} aria-invalid={v.amount !== "" && !(Number(v.amount) > 0)} />
                </Field>
                <Field id="acc-hours" label={t("rqChangeHours")}>
                  <Input id="acc-hours" type="number" min={0} value={v.hours} onChange={(e) => set({ hours: e.target.value })} />
                </Field>
                <Field id="acc-phase" label={t("milestone")}>
                  <Select value={v.milestoneId} onValueChange={(milestoneId) => set({ milestoneId })}>
                    <SelectTrigger id="acc-phase" className="w-full"><SelectValue>{v.milestoneId === NONE ? t("rqWholeProject") : phases.find((x) => x.id === v.milestoneId)?.title}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("rqWholeProject")}</SelectItem>
                      {phases.map((x) => <SelectItem key={x.id} value={x.id}>{x.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
              <Button type="submit" disabled={!valid || accept.isPending}>{t(v.outOfScope ? "rqAcceptAndBill" : "rqAccept")}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RejectDialog({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const t = useTranslations()
  const { reject } = useClientRequestMutations()
  const [reason, setReason] = React.useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rqDeclineTitle")}</DialogTitle>
          <DialogDescription>{`${request.number} · ${request.title}`}</DialogDescription>
        </DialogHeader>
        <Field id="rq-reason" label={t("rqReasonLabel")}>
          <Textarea id="rq-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rqReasonPlaceholder")} />
        </Field>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button variant="destructive" disabled={!reason.trim() || reject.isPending} onClick={() => reject.mutate({ id: request.id, reason }, { onSuccess: onClose })}>{t("rqDecline")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SnoozeDialog({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const t = useTranslations()
  const { snooze } = useClientRequestMutations()
  const today = todayIso()
  const [until, setUntil] = React.useState(addDays(today, 7))
  const quick = [
    { days: 7, key: "rqIn1Week" },
    { days: 14, key: "rqIn2Weeks" },
    { days: 30, key: "rqIn1Month" },
  ]
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rqSnoozeTitle")}</DialogTitle>
          <DialogDescription>{t("rqSnoozeHint")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("rqSnoozeQuick")}>
          {quick.map((x) => (
            <button key={x.days} type="button" aria-pressed={until === addDays(today, x.days)} onClick={() => setUntil(addDays(today, x.days))} className={pill(until === addDays(today, x.days))}>{t(x.key)}</button>
          ))}
        </div>
        <Field id="rq-until" label={t("rqSnoozeUntil")}>
          <Input id="rq-until" type="date" min={addDays(today, 1)} value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!until || until <= today || snooze.isPending} onClick={() => snooze.mutate({ id: request.id, until }, { onSuccess: onClose })}>{t("rqSnooze")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DuplicateDialog({ request, onClose }: { request: ClientRequest; onClose: () => void }) {
  const t = useTranslations()
  const { duplicate } = useClientRequestMutations()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  // Open tasks of the client's projects, the request's own project first
  const own = projects.filter((p) => p.clientId === request.clientId)
  const options = tasks
    .filter((x) => own.some((p) => p.id === x.projectId) && !isClosedStatus(x.status))
    .sort((a, b) => Number(b.projectId === request.projectId) - Number(a.projectId === request.projectId))
  const [taskId, setTaskId] = React.useState("")
  const label = (id: string) => {
    const x = options.find((o) => o.id === id)
    return x ? `${taskKey(x, own.find((p) => p.id === x.projectId))} · ${x.title}` : ""
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("rqDuplicateTitle")}</DialogTitle>
          <DialogDescription>{t("rqDuplicateHint")}</DialogDescription>
        </DialogHeader>
        <Field id="rq-dup" label={t("rqCoveringTask")}>
          <Select value={taskId || undefined} onValueChange={setTaskId}>
            <SelectTrigger id="rq-dup" className="w-full"><SelectValue placeholder={t("tkPickTask")}>{taskId ? label(taskId) : undefined}</SelectValue></SelectTrigger>
            <SelectContent>{options.map((x) => <SelectItem key={x.id} value={x.id}>{label(x.id)}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={!taskId || duplicate.isPending} onClick={() => duplicate.mutate({ id: request.id, taskId }, { onSuccess: onClose })}>{t("rqDuplicate")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LogDialog({ clients, onClose }: { clients: { id: string; name: string }[]; onClose: () => void }) {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const { create } = useClientRequestMutations()
  const [v, setV] = React.useState({ clientId: clients[0]?.id ?? "", projectId: NONE, kind: RequestKind.CHANGE, title: "", description: "", urgent: false, from: "" })
  const open = useOpenProjects(v.clientId)
  const set = (patch: Partial<typeof v>) => setV((x) => ({ ...x, ...patch }))
  const submit = () =>
    create.mutate(
      {
        clientId: v.clientId,
        by: v.from.trim() || authedUser?.name || t("admin"),
        team: true,
        input: { projectId: v.projectId === NONE ? undefined : v.projectId, kind: v.kind, title: v.title, description: v.description, urgent: v.urgent },
      },
      { onSuccess: onClose }
    )
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("rqLogTitle")}</DialogTitle>
          <DialogDescription>{t("rqLogHint")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); submit() }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="log-client" label={t("client")}>
              <Select value={v.clientId} onValueChange={(clientId) => set({ clientId, projectId: NONE })}>
                <SelectTrigger id="log-client" className="w-full"><SelectValue>{clients.find((c) => c.id === v.clientId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="log-project" label={t("project")}>
              <Select value={v.projectId} onValueChange={(projectId) => set({ projectId })}>
                <SelectTrigger id="log-project" className="w-full"><SelectValue>{v.projectId === NONE ? t("rqNotSure") : open.find((p) => p.id === v.projectId)?.name}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("rqNotSure")}</SelectItem>
                  {open.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field id="log-kind" label={t("rqKind")}>
              <Select value={v.kind} onValueChange={(k) => set({ kind: k as RequestKind })}>
                <SelectTrigger id="log-kind" className="w-full"><SelectValue>{t(`rqKind_${v.kind}`)}</SelectValue></SelectTrigger>
                <SelectContent>{Object.values(RequestKind).map((k) => <SelectItem key={k} value={k}>{t(`rqKind_${k}`)}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field id="log-from" label={t("rqFrom")}>
              <Input id="log-from" value={v.from} onChange={(e) => set({ from: e.target.value })} placeholder={t("rqFromPlaceholder")} />
            </Field>
          </div>
          <Field id="log-title" label={t("rqWhat")}>
            <Input id="log-title" value={v.title} maxLength={MAX_REQUEST_TITLE} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field id="log-details" label={t("rqDetails")}>
            <Textarea id="log-details" rows={3} value={v.description} maxLength={MAX_REQUEST_DETAILS} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={v.urgent} onCheckedChange={(c) => set({ urgent: c === true })} />
            {t("rqUrgentLabel")}
          </label>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>{t("cancel")}</Button>
            <Button type="submit" disabled={!v.clientId || v.title.trim().length < 3 || create.isPending}>{t("rqLog")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

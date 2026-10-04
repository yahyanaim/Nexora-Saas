"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, CheckCircle2, Clock, DollarSign, Users, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useTimeEntries, useTimesheetMutations } from "@/hooks/workforce/use-work-billing"
import { addDays, entryBillRate, weekStart } from "@/lib/workforce/billing"
import { BudgetType } from "@/types/work-projects"
import { TimeEntryStatus, type TimeEntry } from "@/types/work-billing"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatHours } from "./billing-labels"

interface Group {
  key: string
  employeeId: string
  monday: string
  entries: TimeEntry[]
}

export default function ApprovalsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: entries = [], isLoading } = useTimeEntries()
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: clients = [] } = useClients()
  const { approve, reject } = useTimesheetMutations()
  const canReview = can(authedUser, AdminPermissionsPlatform.TIME_APPROVE)

  const [rejecting, setRejecting] = useState<Group | null>(null)
  const [reason, setReason] = useState("")

  const submitted = useMemo(() => entries.filter((e) => e.status === TimeEntryStatus.SUBMITTED), [entries])

  const groups = useMemo(() => {
    const map = new Map<string, Group>()
    for (const e of submitted) {
      const monday = weekStart(e.date)
      const key = `${e.employeeId}:${monday}`
      const g = map.get(key) ?? { key, employeeId: e.employeeId, monday, entries: [] }
      g.entries.push(e)
      map.set(key, g)
    }
    return [...map.values()].sort((a, b) => a.monday.localeCompare(b.monday))
  }, [submitted])

  const billableValue = (list: TimeEntry[]) =>
    list.reduce((sum, e) => {
      const project = projects.find((p) => p.id === e.projectId)
      if (!e.billable || project?.budgetType !== BudgetType.HOURLY) return sum
      const client = clients.find((c) => c.id === project.clientId)
      return sum + e.hours * entryBillRate(e, employees.find((x) => x.id === e.employeeId), client)
    }, 0)

  const formatWeek = (monday: string) =>
    `${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${monday}T00:00:00`))} – ${new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${addDays(monday, 6)}T00:00:00`))}`

  const cards: MetricCardItem[] = [
    { key: "hours", title: t("hoursToReview"), value: formatHours(submitted.reduce((s, e) => s + e.hours, 0)), valueClassName: "text-info-foreground", footer: { icon: Clock, text: t("submittedByTeam") } },
    { key: "sheets", title: t("timesheetsWaiting"), value: groups.length, footer: { icon: CheckCircle, text: t("oneCardPerPersonWeek") } },
    { key: "people", title: t("people"), value: new Set(groups.map((g) => g.employeeId)).size, footer: { icon: Users, text: t("waitingForYou") } },
    { key: "value", title: t("billableValue"), value: formatMoney(billableValue(submitted), workspace.currency, locale), valueClassName: "text-primary", footer: { icon: DollarSign, text: t("onHourlyProjects") } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canReview && groups.length > 1 && (
            <Button onClick={() => approve.mutate(submitted.map((e) => e.id))} disabled={approve.isPending}>
              <CheckCircle2 className="size-4" />
              {t("approveAll")}
            </Button>
          )
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {isLoading ? (
        <ListSkeleton rows={3} />
      ) : groups.length === 0 ? (
        <EmptyState icon={CheckCircle} title={t("allCaughtUp")} hint={t("noHoursWaiting")} className="bg-card" />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {groups.map((group) => {
            const person = employees.find((e) => e.id === group.employeeId)
            const total = group.entries.reduce((s, e) => s + e.hours, 0)
            const byRow = new Map<string, { label: string; code?: string; hours: number }>()
            for (const e of group.entries) {
              const project = projects.find((p) => p.id === e.projectId)
              const task = tasks.find((x) => x.id === e.taskId)
              const key = `${e.projectId}:${e.taskId ?? ""}`
              const row = byRow.get(key) ?? { label: `${project?.name ?? "—"}${task ? ` · ${task.title}` : ""}`, code: project?.code, hours: 0 }
              row.hours += e.hours
              byRow.set(key, row)
            }
            return (
              <article key={group.key} className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-5 shadow-panel">
                <header className="flex items-center gap-3">
                  <SpaceAvatar name={person?.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-semibold">{person?.name ?? "—"}</h2>
                    <p className="text-sm text-muted-foreground">{t("weekOf", { week: formatWeek(group.monday) })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tabular-nums">{formatHours(total)}</p>
                    {person && (
                      <p className="text-xs text-muted-foreground">{t("ofCapacity", { capacity: person.weeklyCapacity })}</p>
                    )}
                  </div>
                </header>
                <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                  {[...byRow.values()].map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate">{row.label}</span>
                        {row.code && <span className="text-xs text-muted-foreground">{row.code}</span>}
                      </span>
                      <span className="font-medium tabular-nums">{formatHours(row.hours)}</span>
                    </li>
                  ))}
                </ul>
                <footer className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t("billableValueIs", { amount: formatMoney(billableValue(group.entries), workspace.currency, locale) })}
                  </span>
                  {canReview && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setReason("")
                          setRejecting(group)
                        }}
                      >
                        <XCircle className="size-4" />
                        {t("sendBack")}
                      </Button>
                      <Button onClick={() => approve.mutate(group.entries.map((e) => e.id))} disabled={approve.isPending}>
                        <CheckCircle2 className="size-4" />
                        {t("approve")}
                      </Button>
                    </div>
                  )}
                </footer>
              </article>
            )
          })}
        </div>
      )}

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("sendBackHours")}</DialogTitle>
            <DialogDescription>{t("sendBackHoursDescription")}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!rejecting || !reason.trim()) return
              reject.mutate({ ids: rejecting.entries.map((x) => x.id), reason }, { onSuccess: () => setRejecting(null) })
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-reason">{t("reason")}</Label>
              <Textarea id="reject-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("rejectReasonPlaceholder")} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejecting(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" variant="destructive" disabled={!reason.trim() || reject.isPending}>
                {t("sendBack")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

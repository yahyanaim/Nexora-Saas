"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CalendarDays, CheckCircle2, Clock, Plus, TreePalm, Users, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useLeave, useLeaveMutations } from "@/hooks/workforce/use-leave"
import { addDays, weekStart } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { rangesOverlap, vacationBalance, workingDays } from "@/lib/workforce/planning"
import { EmployeeStatus } from "@/types/workforce"
import { LeaveStatus, LeaveType, type LeaveRequest } from "@/types/work-planning"
import { includesFilter } from "../workforce-chunks/workforce-labels"
import { LEAVE_STATUS_CLASS, LEAVE_STATUS_LABEL, LEAVE_TYPE_LABEL, formatRange } from "./planning-labels"

export default function LeavePage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const { data: requests = [], isLoading } = useLeave()
  const { data: settings } = useWorkspaceSettings()
  const enabledLeaveTypes = settings ? settings.leaveTypes.filter((l) => l.enabled).map((l) => l.type) : Object.values(LeaveType)
  const vacationAllowance = settings?.leaveTypes.find((l) => l.type === LeaveType.VACATION)?.yearlyDays
  const { data: employees = [] } = useEmployees()
  const { request, decide, cancel } = useLeaveMutations()
  const canApprove = can(authedUser, AdminPermissionsPlatform.TIME_APPROVE)

  const staff = employees.filter((e) => e.status !== EmployeeStatus.INACTIVE)
  const today = todayIso()
  const monday = weekStart(today)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: "", type: LeaveType.VACATION, startDate: today, endDate: today, note: "" })
  const [declining, setDeclining] = useState<LeaveRequest | null>(null)
  const [reason, setReason] = useState("")

  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—"
  const pending = requests.filter((r) => r.status === LeaveStatus.PENDING)
  const approved = requests.filter((r) => r.status === LeaveStatus.APPROVED)

  const cards: MetricCardItem[] = [
    { key: "pending", title: t("pendingRequests"), value: pending.length, valueClassName: pending.length ? "text-warning-foreground" : undefined, footer: { icon: Clock, text: t("waitingForDecision") } },
    { key: "today", title: t("offToday"), value: new Set(approved.filter((r) => r.startDate <= today && r.endDate >= today).map((r) => r.employeeId)).size, footer: { icon: TreePalm, text: t("approvedLeave") } },
    { key: "week", title: t("offThisWeek"), value: new Set(approved.filter((r) => rangesOverlap(r.startDate, r.endDate, monday, addDays(monday, 6))).map((r) => r.employeeId)).size, valueClassName: "text-info-foreground", footer: { icon: CalendarDays, text: t("atLeastOneDay") } },
    { key: "people", title: t("people"), value: staff.length, footer: { icon: Users, text: t("vacationAllowance", { days: 25 }) } },
  ]

  const openForm = () => {
    setForm({ employeeId: staff[0]?.id ?? "", type: LeaveType.VACATION, startDate: today, endDate: today, note: "" })
    setFormOpen(true)
  }
  const days = form.endDate >= form.startDate ? workingDays(form.startDate, form.endDate).length : 0

  const columns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      {
        id: "employee",
        accessorFn: (r) => employees.find((e) => e.id === r.employeeId)?.name ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("employee")} />,
        filterFn: (row, id, value: string) => String(row.getValue(id)).toLowerCase().includes(String(value ?? "").toLowerCase()),
        cell: ({ getValue }) => (
          <span className="flex items-center gap-2 text-sm font-medium">
            <SpaceAvatar name={String(getValue())} size="xs" />
            {String(getValue())}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("type")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => <span className="text-sm">{t(LEAVE_TYPE_LABEL[row.original.type])}</span>,
      },
      {
        accessorKey: "startDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("dates")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatRange(row.original.startDate, row.original.endDate, locale)}</span>,
      },
      {
        id: "days",
        header: () => <span>{t("workingDaysCount")}</span>,
        cell: ({ row }) => <span className="text-sm tabular-nums">{workingDays(row.original.startDate, row.original.endDate).length}</span>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-0.5">
            <Badge variant="outline" className={LEAVE_STATUS_CLASS[row.original.status]}>{t(LEAVE_STATUS_LABEL[row.original.status])}</Badge>
            {row.original.decisionNote && <span className="text-xs text-muted-foreground">{row.original.decisionNote}</span>}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const r = row.original
          const cancellable = r.status === LeaveStatus.PENDING || (r.status === LeaveStatus.APPROVED && r.startDate > today)
          return cancellable ? (
            <Button variant="ghost" size="sm" onClick={() => cancel.mutate(r.id)}>
              {t("cancelLeave")}
            </Button>
          ) : null
        },
      },
    ],
    [t, locale, employees, today, cancel]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <Button onClick={openForm}>
            <Plus className="size-4" />
            {t("requestLeave")}
          </Button>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {pending.length > 0 && (
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("waitingForDecision")}</h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                <div className="flex items-center gap-3">
                  <SpaceAvatar name={nameOf(r.employeeId)} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nameOf(r.employeeId)}</p>
                    <p className="text-sm text-muted-foreground">
                      {t(LEAVE_TYPE_LABEL[r.type])} · {formatRange(r.startDate, r.endDate, locale)} · {t("daysCount", { count: workingDays(r.startDate, r.endDate).length })}
                    </p>
                  </div>
                </div>
                {r.note && <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm text-muted-foreground">{r.note}</p>}
                {canApprove && (
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setReason(""); setDeclining(r) }}>
                      <XCircle className="size-4" />
                      {t("decline")}
                    </Button>
                    <Button size="sm" onClick={() => decide.mutate({ id: r.id, approved: true })} disabled={decide.isPending}>
                      <CheckCircle2 className="size-4" />
                      {t("approve")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <header>
          <h2 className="text-base font-semibold">{t("vacationBalances")}</h2>
          <p className="text-sm text-muted-foreground">{t("vacationBalancesHint", { year: today.slice(0, 4) })}</p>
        </header>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {staff.map((e) => {
            const b = vacationBalance(requests, e.id, Number(today.slice(0, 4)), vacationAllowance)
            return (
              <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-border p-3.5">
                <SpaceAvatar name={e.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium">{e.name}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">{t("daysLeft", { count: b.remaining })}</span>
                  </div>
                  <Progress value={((b.used + b.pending) / b.allowance) * 100} aria-label={t("vacationUsed")} className="mt-1.5 h-1.5" />
                  <p className="mt-1 text-xs text-muted-foreground">{t("usedPending", { used: b.used, pending: b.pending })}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <DataTable
        title={t("allRequests")}
        isLoading={isLoading}
        columns={columns}
        data={[...requests].reverse()}
        searchColumnId="employee"
        searchPlaceholder={t("searchByEmployee")}
        exportFilename="leave"
        filters={[
          { columnId: "status", title: t("status"), options: Object.values(LeaveStatus).map((s) => ({ label: t(LEAVE_STATUS_LABEL[s]), value: s })) },
          { columnId: "type", title: t("type"), options: Object.values(LeaveType).map((s) => ({ label: t(LEAVE_TYPE_LABEL[s]), value: s })) },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        createTitle={t("requestLeave")}
        editTitle={t("requestLeave")}
        description={t("requestLeaveDescription")}
        submitLabel={{ create: t("sendRequest") }}
        isSubmitting={request.isPending}
        onSubmit={() =>
          request.mutate(
            { employeeId: form.employeeId, type: form.type, startDate: form.startDate, endDate: form.endDate, note: form.note.trim() || undefined },
            { onSuccess: () => setFormOpen(false) }
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("employee")}</Label>
            <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v }))}>
              <SelectTrigger className="w-full bg-card" aria-label={t("employee")}>
                <SelectValue>{nameOf(form.employeeId)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {staff.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("type")}</Label>
            <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as LeaveType }))}>
              <SelectTrigger className="w-full bg-card" aria-label={t("type")}>
                <SelectValue>{t(LEAVE_TYPE_LABEL[form.type])}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {enabledLeaveTypes.map((v) => <SelectItem key={v} value={v}>{t(LEAVE_TYPE_LABEL[v])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-start">{t("firstDay")}</Label>
              <Input id="leave-start" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value, endDate: f.endDate < e.target.value ? e.target.value : f.endDate }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="leave-end">{t("lastDay")}</Label>
              <Input id="leave-end" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <p className="-mt-2 text-sm text-muted-foreground">{t("workingDaysSelected", { count: days })}</p>
          {form.type === LeaveType.VACATION && form.employeeId && (
            <p className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
              {t("vacationLeftAfter", { count: vacationBalance(requests, form.employeeId, Number(form.startDate.slice(0, 4)), vacationAllowance).remaining - days })}
            </p>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="leave-note">{t("notes")}</Label>
            <Textarea id="leave-note" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
        </div>
      </DataTableEntityFormSheet>

      <Dialog open={!!declining} onOpenChange={(open) => !open && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("declineLeave")}</DialogTitle>
            <DialogDescription>{declining ? `${nameOf(declining.employeeId)} · ${formatRange(declining.startDate, declining.endDate, locale)}` : ""}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!declining || !reason.trim()) return
              decide.mutate({ id: declining.id, approved: false, note: reason }, { onSuccess: () => setDeclining(null) })
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="decline-reason">{t("reason")}</Label>
              <Textarea id="decline-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeclining(null)}>{t("cancel")}</Button>
              <Button type="submit" variant="destructive" disabled={!reason.trim() || decide.isPending}>{t("decline")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

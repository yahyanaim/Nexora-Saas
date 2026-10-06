"use client"

import { useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
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
import { CheckCircle2, Clock, DollarSign, FileText, Plus, Receipt, Trash2, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useEmployees } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useExpenseMutations, useExpenses } from "@/hooks/workforce/use-expenses"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { todayIso } from "@/lib/workforce/project-metrics"
import { toast } from "@/lib/utils/toast"
import { EmployeeStatus } from "@/types/workforce"
import { ExpenseCategory, ExpenseStatus, type Expense } from "@/types/work-costs"
import { formatMoney, includesFilter, NONE } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import {
  EXPENSE_CATEGORY_LABEL,
  EXPENSE_STATUS_CLASS,
  EXPENSE_STATUS_LABEL,
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
} from "./cost-labels"
import { useSelfScope } from "@/hooks/workforce/use-current-employee"
import { useApprover } from "@/hooks/workforce/use-current-employee"
import { approverRef } from "@/lib/workforce/approvals"

const emptyForm = () => ({
  employeeId: "",
  projectId: NONE,
  date: todayIso(),
  category: ExpenseCategory.TRAVEL,
  description: "",
  amount: "",
  vatAmount: "",
  billable: false,
  receiptName: "",
})

export default function ExpensesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: allExpenses = [], isLoading } = useExpenses()
  // Without the approve right a person only sees and submits their own expenses
  const self = useSelfScope()
  const expenses = allExpenses.filter((x) => self.isMine(x.employeeId))
  const { data: settings } = useWorkspaceSettings()
  const enabledCategories = settings
    ? settings.expenseCategories.filter((c) => c.enabled).map((c) => c.category)
    : Object.values(ExpenseCategory)
  const { data: employees = [] } = useEmployees()
  const { data: projects = [] } = useProjects()
  const { submit, review, reimburse, remove } = useExpenseMutations()
  const canReview = can(authedUser, AdminPermissionsPlatform.TIME_APPROVE)
  const approver = useApprover()

  const staff = self.restrict(employees.filter((e) => e.status !== EmployeeStatus.INACTIVE))
  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const nameOf = (id: string) => employees.find((e) => e.id === id)?.name ?? "—"
  const projectOf = (id?: string) => projects.find((p) => p.id === id)

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [rejecting, setRejecting] = useState<Expense | null>(null)
  const [reason, setReason] = useState("")

  const submitted = expenses.filter((x) => x.status === ExpenseStatus.SUBMITTED)
  const month = todayIso().slice(0, 7)
  const sum = (list: Expense[]) => list.reduce((s, x) => s + x.amount, 0)

  const cards: MetricCardItem[] = [
    { key: "review", title: t("toReview"), value: submitted.length, valueClassName: submitted.length ? "text-info-foreground" : undefined, footer: { icon: Clock, text: money(sum(submitted)) } },
    { key: "reimburse", title: t("toReimburse"), value: money(sum(expenses.filter((x) => x.status === ExpenseStatus.APPROVED))), valueClassName: "text-warning-foreground", footer: { icon: DollarSign, text: t("approvedNotPaidBack") } },
    { key: "month", title: t("spentThisMonth"), value: money(sum(expenses.filter((x) => x.date.startsWith(month) && x.status !== ExpenseStatus.REJECTED))), footer: { icon: Receipt, text: t("excludingRejected") } },
    { key: "rebill", title: t("toRebill"), value: money(sum(expenses.filter((x) => x.billable && !x.invoiceId && (x.status === ExpenseStatus.APPROVED || x.status === ExpenseStatus.REIMBURSED)))), valueClassName: "text-primary", footer: { icon: FileText, text: t("addToNextInvoice") } },
  ]

  const memberProjects = projects.filter((p) => p.memberIds.includes(form.employeeId))

  const onReceipt = (file?: File) => {
    if (!file) return setForm((f) => ({ ...f, receiptName: "" }))
    if (!RECEIPT_TYPES.includes(file.type)) return toast.error(t("receiptType"))
    if (file.size > RECEIPT_MAX_BYTES) return toast.error(t("receiptTooLarge"))
    setForm((f) => ({ ...f, receiptName: file.name }))
  }

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        accessorKey: "description",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("expense")} />,
        filterFn: (row, _id, value: string) => {
          const q = String(value ?? "").toLowerCase()
          return [row.original.description, employees.find((e) => e.id === row.original.employeeId)?.name ?? ""].some((s) => s.toLowerCase().includes(q))
        },
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{row.original.description}</span>
            <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              {t(EXPENSE_CATEGORY_LABEL[row.original.category])}
              {row.original.receiptName && (
                <>
                  · <FileText className="size-3" /> {row.original.receiptName}
                </>
              )}
            </span>
          </span>
        ),
      },
      {
        id: "employee",
        accessorFn: (x) => x.employeeId,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("employee")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => (
          <span className="flex items-center gap-2 text-sm">
            <SpaceAvatar name={employees.find((e) => e.id === row.original.employeeId)?.name} size="xs" />
            {employees.find((e) => e.id === row.original.employeeId)?.name ?? "—"}
          </span>
        ),
      },
      {
        id: "project",
        header: () => <span>{t("project")}</span>,
        cell: ({ row }) => {
          const p = projects.find((x) => x.id === row.original.projectId)
          return (
            <span className="flex flex-col text-sm">
              {p ? p.code : t("general")}
              {row.original.billable && <span className="text-xs text-primary">{row.original.invoiceId ? t("rebilled") : t("rebillable")}</span>}
            </span>
          )
        },
      },
      {
        accessorKey: "date",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("date")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatShortDate(row.original.date, locale)}</span>,
      },
      {
        accessorKey: "amount",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("amount")} />,
        cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{formatMoney(row.original.amount, workspace.currency, locale)}</span>,
      },
      {
        accessorKey: "status",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        filterFn: (row, id, value) => includesFilter(row.getValue(id), value),
        cell: ({ row }) => (
          <span className="flex flex-col items-start gap-0.5">
            <Badge variant="outline" className={EXPENSE_STATUS_CLASS[row.original.status]}>{t(EXPENSE_STATUS_LABEL[row.original.status])}</Badge>
            {row.original.rejectionReason && <span className="text-xs text-muted-foreground">{row.original.rejectionReason}</span>}
          </span>
        ),
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const x = row.original
          if (x.status === ExpenseStatus.APPROVED && canReview) {
            return <Button variant="outline" size="sm" onClick={() => reimburse.mutate(x.id)}>{t("markReimbursed")}</Button>
          }
          if (x.status === ExpenseStatus.SUBMITTED || x.status === ExpenseStatus.REJECTED) {
            return (
              <Button variant="ghost" size="sm" aria-label={t("deleteExpense")} onClick={() => remove.mutate(x.id)}>
                <Trash2 className="size-4" />
              </Button>
            )
          }
          return null
        },
      },
    ],
    [t, locale, employees, projects, workspace.currency, canReview, reimburse, remove]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <Button onClick={() => { setForm({ ...emptyForm(), employeeId: staff[0]?.id ?? "" }); setFormOpen(true) }}>
            <Plus className="size-4" />
            {t("addExpense")}
          </Button>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      {canReview && submitted.length > 0 && (
        <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("waitingForReview")}</h2>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {submitted.map((x) => (
              <li key={x.id} className="flex flex-col gap-3 rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{x.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {nameOf(x.employeeId)} · {projectOf(x.projectId)?.code ?? t("general")} · {formatShortDate(x.date, locale)}
                    </p>
                  </div>
                  <span className="text-base font-semibold tabular-nums">{money(x.amount)}</span>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" />
                  {x.receiptName ?? t("noReceipt")}
                </p>
                {x.firstApprovedBy && <span className="w-fit rounded-full bg-info-soft px-2.5 py-0.5 text-xs font-medium text-info-foreground">{t("approvalOneOfTwo")}</span>}
                {x.employeeId === approver.employeeId || x.firstApprovedBy === approverRef(approver) ? (
                  <p className="text-end text-sm text-muted-foreground">{t(x.employeeId === approver.employeeId ? "approvalOwnRequest" : "approvalWaitingSecond")}</p>
                ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setReason(""); setRejecting(x) }}>
                    <XCircle className="size-4" />
                    {t("reject")}
                  </Button>
                  <Button size="sm" onClick={() => review.mutate({ id: x.id, approved: true })} disabled={review.isPending}>
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

      <DataTable
        title={t("expenses")}
        isLoading={isLoading}
        columns={columns}
        data={expenses}
        searchColumnId="description"
        searchPlaceholder={t("searchExpenses")}
        exportFilename="expenses"
        filters={[
          { columnId: "status", title: t("status"), options: Object.values(ExpenseStatus).map((s) => ({ label: t(EXPENSE_STATUS_LABEL[s]), value: s })) },
          { columnId: "employee", title: t("employee"), options: staff.map((e) => ({ label: e.name, value: e.id })) },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="create"
        createTitle={t("addExpense")}
        editTitle={t("addExpense")}
        description={t("addExpenseDescription")}
        submitLabel={{ create: t("submitExpense") }}
        isSubmitting={submit.isPending}
        onSubmit={() =>
          submit.mutate(
            {
              employeeId: form.employeeId,
              projectId: form.projectId === NONE ? undefined : form.projectId,
              date: form.date,
              category: form.category,
              description: form.description,
              amount: Number(form.amount.replace(",", ".")),
              vatAmount: form.vatAmount.trim() ? Number(form.vatAmount.replace(",", ".")) : undefined,
              billable: form.billable,
              receiptName: form.receiptName || undefined,
            },
            { onSuccess: () => setFormOpen(false) }
          )
        }
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>{t("employee")}</Label>
            <Select value={form.employeeId} onValueChange={(v) => setForm((f) => ({ ...f, employeeId: v, projectId: NONE }))}>
              <SelectTrigger className="w-full bg-card" aria-label={t("employee")}><SelectValue>{nameOf(form.employeeId)}</SelectValue></SelectTrigger>
              <SelectContent>{staff.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-desc">{t("description")}</Label>
            <Input id="exp-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder={t("expensePlaceholder")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="exp-amount">{`${t("amount")} (${workspace.currency})`}</Label>
              <Input id="exp-amount" inputMode="decimal" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="exp-date">{t("date")}</Label>
              <Input id="exp-date" type="date" max={todayIso()} value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-vat">{`${t("expenseVat")} (${workspace.currency})`}</Label>
            <Input id="exp-vat" inputMode="decimal" value={form.vatAmount} onChange={(e) => setForm((f) => ({ ...f, vatAmount: e.target.value }))} placeholder="0" />
            <p className="text-xs text-muted-foreground">{t("expenseVatHint")}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>{t("category")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as ExpenseCategory }))}>
                <SelectTrigger className="w-full bg-card" aria-label={t("category")}><SelectValue>{t(EXPENSE_CATEGORY_LABEL[form.category])}</SelectValue></SelectTrigger>
                <SelectContent>{enabledCategories.map((c) => <SelectItem key={c} value={c}>{t(EXPENSE_CATEGORY_LABEL[c])}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("project")}</Label>
              <Select value={form.projectId} onValueChange={(v) => setForm((f) => ({ ...f, projectId: v, billable: v === NONE ? false : f.billable }))}>
                <SelectTrigger className="w-full bg-card" aria-label={t("project")}><SelectValue>{form.projectId === NONE ? t("general") : projectOf(form.projectId)?.code}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("general")}</SelectItem>
                  {memberProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center justify-between gap-4 rounded-xl border border-border p-3 text-sm">
            <span>
              <span className="block font-medium">{t("rebillToClient")}</span>
              <span className="block text-xs text-muted-foreground">{t("rebillHint")}</span>
            </span>
            <Switch checked={form.billable} disabled={form.projectId === NONE} onChange={(v) => setForm((f) => ({ ...f, billable: v }))} />
          </label>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exp-receipt">{t("receipt")}</Label>
            <Input id="exp-receipt" type="file" accept={RECEIPT_TYPES.join(",")} onChange={(e) => onReceipt(e.target.files?.[0])} />
            <p className="text-xs text-muted-foreground">{form.receiptName || t("receiptHint")}</p>
          </div>
        </div>
      </DataTableEntityFormSheet>

      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectExpense")}</DialogTitle>
            <DialogDescription>{rejecting ? `${rejecting.description} · ${money(rejecting.amount)}` : ""}</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!rejecting || !reason.trim()) return
              review.mutate({ id: rejecting.id, approved: false, reason }, { onSuccess: () => setRejecting(null) })
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="reject-exp">{t("reason")}</Label>
              <Textarea id="reject-exp" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRejecting(null)}>{t("cancel")}</Button>
              <Button type="submit" variant="destructive" disabled={!reason.trim() || review.isPending}>{t("reject")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

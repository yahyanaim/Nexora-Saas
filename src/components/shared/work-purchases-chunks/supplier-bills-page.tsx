"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle2, FileText, Pencil, Plus, Trash2, Warning, Receipt } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useSuppliers } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { PhaseSelect } from "../work-projects-chunks/phase-select"
import { useSupplierBillMutations, useSupplierBills } from "@/hooks/workforce/use-supplier-bills"
import { useApprover } from "@/hooks/workforce/use-current-employee"
import { can } from "@/lib/permissions/can"
import { approverRef } from "@/lib/workforce/approvals"
import { createId } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { billDisplayStatus, billDueDate, billTotals, type BillDisplayStatus } from "@/lib/workforce/supplier-bills"
import { cn } from "@/lib/utils"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { AdminPermissionsPlatform } from "@/types/roles"
import { SupplierBillStatus, SupplierStatus, type SupplierBill, type SupplierBillInput, type SupplierBillPayment } from "@/types/work-purchases"
import { formatMoney } from "../workforce-chunks/workforce-labels"

const NONE = "__none__"
type Filter = "toApprove" | "toPay" | "all"

const STATUS_CLASS: Record<BillDisplayStatus, string> = {
  submitted: "bg-warning-soft text-warning-foreground",
  approved: "bg-info-soft text-info-foreground",
  partially_paid: "bg-info-soft text-info-foreground",
  overdue: "bg-danger-soft text-destructive",
  paid: "bg-success-soft text-success-foreground",
  rejected: "bg-muted text-muted-foreground",
}

const emptyBill = (): SupplierBillInput => {
  const today = todayIso()
  return { supplierId: "", number: "", issueDate: today, dueDate: addDays(today, 30), taxRate: 20, lines: [{ id: createId("bl"), description: "", quantity: 1, unitPrice: 0 }] }
}

/** Bills received from suppliers: entry, approval and payment (Phase 6f.2). */
export default function SupplierBillsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { currency } = useCurrentWorkspace()
  const { authedUser } = useAuthGuard()
  const approver = useApprover()
  const me = approverRef(approver)
  const canApprove = can(authedUser, AdminPermissionsPlatform.INVOICES_UPDATE)
  const { data: bills = [], isLoading } = useSupplierBills()
  const { data: suppliers = [] } = useSuppliers()
  const { data: projects = [] } = useProjects()
  const { save, review, pay, remove } = useSupplierBillMutations()
  const today = todayIso()

  const [filter, setFilter] = useState<Filter>("all")
  const [editing, setEditing] = useState<{ id?: string; input: SupplierBillInput } | null>(null)
  const [paying, setPaying] = useState<{ bill: SupplierBill; payment: Omit<SupplierBillPayment, "id"> } | null>(null)
  const [rejecting, setRejecting] = useState<{ bill: SupplierBill; reason: string } | null>(null)
  const [deleting, setDeleting] = useState<SupplierBill | null>(null)

  const money = (n: number) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const supplierName = (id: string) => suppliers.find((s) => s.id === id)?.name ?? "—"

  const toApprove = bills.filter((b) => b.status === SupplierBillStatus.SUBMITTED)
  const open = bills.filter((b) => b.status === SupplierBillStatus.APPROVED)
  const toPay = open.reduce((s, b) => s + billTotals(b).balance, 0)
  const overdue = open.filter((b) => b.dueDate < today).reduce((s, b) => s + billTotals(b).balance, 0)
  const paid30 = bills.flatMap((b) => b.payments).filter((p) => p.date >= addDays(today, -30)).reduce((s, p) => s + p.amount, 0)

  const cards: MetricCardItem[] = [
    { key: "approve", title: t("billsToApprove"), value: toApprove.length, valueClassName: toApprove.length ? "text-warning-foreground" : undefined, footer: { icon: CheckCircle2, text: t("billsToApproveHint") } },
    { key: "pay", title: t("billsToPay"), value: money(toPay), valueClassName: "text-primary", footer: { icon: Receipt, text: t("billsToPayHint") } },
    { key: "overdue", title: t("billsOverdue"), value: money(overdue), valueClassName: overdue ? "text-destructive" : undefined, footer: { icon: Warning, text: t("billsOverdueHint") } },
    { key: "paid", title: t("billsPaid30"), value: money(paid30), footer: { icon: FileText, text: t("billsPaid30Hint") } },
  ]

  const shown = useMemo(
    () =>
      bills
        .filter((b) => (filter === "toApprove" ? b.status === SupplierBillStatus.SUBMITTED : filter === "toPay" ? b.status === SupplierBillStatus.APPROVED : true))
        .sort((a, b) => b.issueDate.localeCompare(a.issueDate)),
    [bills, filter]
  )

  const set = (patch: Partial<SupplierBillInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))
  const setLine = (i: number, patch: Partial<SupplierBillInput["lines"][number]>) =>
    setEditing((e) => (e ? { ...e, input: { ...e.input, lines: e.input.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } } : e))
  const pickSupplier = (supplierId: string) => {
    const terms = suppliers.find((s) => s.id === supplierId)?.paymentTermsDays ?? 30
    setEditing((e) => (e ? { ...e, input: { ...e.input, supplierId, dueDate: billDueDate(e.input.issueDate, terms) } } : e))
  }
  const totals = editing ? billTotals(editing.input) : null

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={<Button onClick={() => setEditing({ input: emptyBill() })}><Plus className="size-4" /> {t("billNew")}</Button>} />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("supplierBills")}</h2>
            <p className="text-sm text-muted-foreground">{t("billsListHint")}</p>
          </div>
          <div className="flex gap-1" role="tablist">
            {(["all", "toApprove", "toPay"] as Filter[]).map((f) => (
              <Button key={f} size="sm" role="tab" aria-selected={filter === f} variant={filter === f ? "primary" : "outline"} onClick={() => setFilter(f)}>
                {t(f === "all" ? "billsFilterAll" : f === "toApprove" ? "billsToApprove" : "billsToPay")}
              </Button>
            ))}
          </div>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : shown.length === 0 ? (
          <EmptyState icon={FileText} title={t("billsEmpty")} hint={t("billsEmptyHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {shown.map((b) => {
              const tot = billTotals(b)
              const status = billDisplayStatus(b, today)
              const editable = b.status === SupplierBillStatus.SUBMITTED || b.status === SupplierBillStatus.REJECTED
              const project = projects.find((p) => p.id === b.projectId)
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{supplierName(b.supplierId)} · <span className="font-mono">{b.number}</span></p>
                    <p className="truncate text-xs text-muted-foreground">
                      {date(b.issueDate)} · {t("billDue", { date: date(b.dueDate) })}
                      {project ? ` · ${project.code}` : ""}
                      {b.rejectionReason ? ` · ${b.rejectionReason}` : ""}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-sm font-medium tabular-nums">{money(tot.total)}</p>
                    {tot.paid > 0 && tot.balance > 0 && <p className="text-xs text-muted-foreground tabular-nums">{t("billLeft", { amount: money(tot.balance) })}</p>}
                  </div>
                  <Badge variant="outline" className={cn("w-28 justify-center border-transparent", STATUS_CLASS[status])}>{t(`billStatus_${status}`)}</Badge>
                  <div className="flex gap-1">
                    {b.status === SupplierBillStatus.SUBMITTED && canApprove && b.submittedBy !== me && (
                      <>
                        <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: b.id, approved: true })}>{t("approve")}</Button>
                        <Button size="sm" variant="outline" onClick={() => setRejecting({ bill: b, reason: "" })}>{t("reject")}</Button>
                      </>
                    )}
                    {b.status === SupplierBillStatus.APPROVED && canApprove && (
                      <Button size="sm" variant="outline" onClick={() => setPaying({ bill: b, payment: { date: today, amount: tot.balance, method: "bank_transfer" } })}>
                        <Receipt className="size-4" /> {t("billPay")}
                      </Button>
                    )}
                    {editable && (
                      <>
                        <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => setEditing({ id: b.id, input: { supplierId: b.supplierId, number: b.number, issueDate: b.issueDate, dueDate: b.dueDate, projectId: b.projectId, milestoneId: b.milestoneId, lines: b.lines, taxRate: b.taxRate, fileName: b.fileName, notes: b.notes } })}>
                          <Pencil className="size-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(b)}><Trash2 className="size-4" /></Button>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode={editing?.id ? "edit" : "create"}
        createTitle={t("billNew")}
        editTitle={t("billEdit")}
        description={t("billFormHint")}
        isSubmitting={save.isPending}
        onSubmit={() => editing && save.mutate(editing, { onSuccess: () => setEditing(null) })}
        submitLabel={{ create: t("billSubmit"), edit: t("billSubmit") }}
      >
      {editing && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("supplier")}</Label>
              <Select value={editing.input.supplierId || NONE} onValueChange={(v) => v !== NONE && pickSupplier(v)}>
                <SelectTrigger className="w-full bg-card" aria-label={t("supplier")}><SelectValue>{editing.input.supplierId ? supplierName(editing.input.supplierId) : t("billChooseSupplier")}</SelectValue></SelectTrigger>
                <SelectContent>
                  {suppliers.filter((s) => s.status === SupplierStatus.ACTIVE).map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-number">{t("billNumber")}</Label>
              <Input id="bill-number" value={editing.input.number} onChange={(e) => set({ number: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-vat">{t("billDefaultVat")}</Label>
              <Input id="bill-vat" type="number" min={0} max={100} value={editing.input.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-date">{t("billDate")}</Label>
              <Input id="bill-date" type="date" value={editing.input.issueDate} onChange={(e) => set({ issueDate: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-due">{t("dueDate")}</Label>
              <Input id="bill-due" type="date" value={editing.input.dueDate} onChange={(e) => set({ dueDate: e.target.value })} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("billProject")}</Label>
              <Select value={editing.input.projectId ?? NONE} onValueChange={(v) => set({ projectId: v === NONE ? undefined : v, milestoneId: undefined })}>
                <SelectTrigger className="w-full bg-card"><SelectValue>{editing.input.projectId ? projects.find((p) => p.id === editing.input.projectId)?.name : t("billNoProject")}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>{t("billNoProject")}</SelectItem>
                  {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <PhaseSelect className="col-span-2 flex flex-col gap-1.5" projectId={editing.input.projectId} value={editing.input.milestoneId} onChange={(v) => set({ milestoneId: v })} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("billLines")}</Label>
            {editing.input.lines.map((l, i) => (
              <div key={l.id} className="flex flex-col gap-2 rounded-2xl border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input aria-label={t("description")} placeholder={t("description")} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                  <Button size="icon-sm" variant="ghost" aria-label={t("delete")} disabled={editing.input.lines.length === 1} onClick={() => set({ lines: editing.input.lines.filter((_, j) => j !== i) })}><Trash2 className="size-4" /></Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input aria-label={t("quantity")} title={t("quantity")} type="number" min={0} value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
                  <Input aria-label={t("unitPrice")} title={t("unitPrice")} type="number" min={0} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
                  <Input aria-label={t("vatRate")} title={t("vatRate")} type="number" min={0} max={100} placeholder={`${editing.input.taxRate} %`} value={l.taxRate ?? ""} onChange={(e) => setLine(i, { taxRate: e.target.value === "" ? undefined : Number(e.target.value) })} />
                </div>
              </div>
            ))}
            <Button size="sm" variant="outline" className="self-start" onClick={() => set({ lines: [...editing.input.lines, { id: createId("bl"), description: "", quantity: 1, unitPrice: 0 }] })}>
              <Plus className="size-4" /> {t("addLine")}
            </Button>
          </div>

          {totals && (
            <dl className="ms-auto grid w-56 grid-cols-2 gap-1 text-sm">
              <dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="text-end tabular-nums">{money(totals.subtotal)}</dd>
              <dt className="text-muted-foreground">{t("vatAmountCol")}</dt><dd className="text-end tabular-nums">{money(totals.tax)}</dd>
              <dt className="font-semibold">{t("total")}</dt><dd className="text-end font-semibold tabular-nums">{money(totals.total)}</dd>
            </dl>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-file">{t("billFile")}</Label>
              <Input id="bill-file" placeholder="facture.pdf" value={editing.input.fileName ?? ""} onChange={(e) => set({ fileName: e.target.value || undefined })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bill-notes">{t("notes")}</Label>
              <Textarea id="bill-notes" rows={1} value={editing.input.notes ?? ""} onChange={(e) => set({ notes: e.target.value || undefined })} />
            </div>
          </div>
        </div>
      )}
      </DataTableEntityFormSheet>

      <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("billPayTitle")}</DialogTitle>
            <DialogDescription>{paying ? `${supplierName(paying.bill.supplierId)} · ${paying.bill.number} · ${t("billLeft", { amount: money(billTotals(paying.bill).balance) })}` : ""}</DialogDescription>
          </DialogHeader>
          {paying && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-amount">{t("amount")}</Label>
                <Input id="pay-amount" type="number" min={0} value={paying.payment.amount} onChange={(e) => setPaying({ ...paying, payment: { ...paying.payment, amount: Number(e.target.value) } })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-date">{t("date")}</Label>
                <Input id="pay-date" type="date" value={paying.payment.date} onChange={(e) => setPaying({ ...paying, payment: { ...paying.payment, date: e.target.value } })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("paymentMethod")}</Label>
                <Select value={paying.payment.method} onValueChange={(v) => setPaying({ ...paying, payment: { ...paying.payment, method: v as SupplierBillPayment["method"] } })}>
                  <SelectTrigger className="w-full bg-card"><SelectValue>{t(`method_${paying.payment.method}`)}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {(["bank_transfer", "cheque", "cash", "card", "other"] as const).map((m) => <SelectItem key={m} value={m}>{t(`method_${m}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="pay-ref">{t("reference")}</Label>
                <Input id="pay-ref" value={paying.payment.reference ?? ""} onChange={(e) => setPaying({ ...paying, payment: { ...paying.payment, reference: e.target.value || undefined } })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaying(null)}>{t("cancel")}</Button>
            <Button disabled={pay.isPending} onClick={() => paying && pay.mutate({ id: paying.bill.id, payment: paying.payment }, { onSuccess: () => setPaying(null) })}>{t("billPay")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejecting} onOpenChange={(o) => !o && setRejecting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("billRejectTitle")}</DialogTitle>
            <DialogDescription>{rejecting ? `${supplierName(rejecting.bill.supplierId)} · ${rejecting.bill.number}` : ""}</DialogDescription>
          </DialogHeader>
          <Textarea aria-label={t("reason")} rows={3} value={rejecting?.reason ?? ""} onChange={(e) => rejecting && setRejecting({ ...rejecting, reason: e.target.value })} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)}>{t("cancel")}</Button>
            <Button disabled={review.isPending} onClick={() => rejecting && review.mutate({ id: rejecting.bill.id, approved: false, reason: rejecting.reason }, { onSuccess: () => setRejecting(null) })}>{t("reject")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("billDeleteTitle")}
        description={t("billDeleteConfirm", { number: deleting?.number ?? "" })}
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

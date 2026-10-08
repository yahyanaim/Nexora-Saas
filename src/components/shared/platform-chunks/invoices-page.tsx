"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DownloadIcon, Receipt, ReceiptText, TrendingUp, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { Link } from "@/i18n/navigation"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, useNxCreditNotes, useNxInvoices, useNxPayments } from "@/hooks/platform/use-platform-billing"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { REFUND_SECOND_APPROVAL_ABOVE, round2 } from "@/lib/platform/billing"
import { exportToCsv } from "@/lib/utils/export-data"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { NxInvoice, NxInvoiceStatus } from "@/types/platform-billing"
import { StepUpDialog } from "./console-shared"
import { InvoiceStatusBadge, Panel, useBillingFormat } from "./billing-shared"

const ALL = "all"
const STATUSES: NxInvoiceStatus[] = ["issued", "paid", "partly_paid", "overdue", "credited"]

/** Nexora's invoices to its customers, never edited after issue (INV-01 to INV-09). */
export default function ConsoleInvoicesPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: invoices = [], isLoading } = useNxInvoices()
  const { data: notes = [] } = useNxCreditNotes()
  const { data: payments = [] } = useNxPayments()
  const m = useBillingMutations()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState(ALL)
  const [open, setOpen] = useState<NxInvoice | null>(null)
  const [crediting, setCrediting] = useState<NxInvoice | null>(null)
  const [form, setForm] = useState({ amount: "", reason: "", refund: false })
  const [stepUp, setStepUp] = useState(false)
  const canCredit = consoleCan(actor?.role, C.CREDIT_NOTES)
  const q = query.trim().toLowerCase()
  const rows = invoices.filter((i) => (status === ALL || i.status === status) && (!q || `${i.number} ${i.customerName} ${i.customerIce ?? ""}`.toLowerCase().includes(q)))
  const month = new Date().toISOString().slice(0, 7)
  const balance = (i: NxInvoice) => round2(i.total - i.paid - i.credited)

  const cards: MetricCardItem[] = [
    { key: "issued", title: t("biIssuedMonth"), value: money(invoices.filter((i) => i.date.startsWith(month)).reduce((s, i) => s + i.total, 0)), footer: { icon: Receipt, text: t("biInclVat") } },
    { key: "collected", title: t("biCollectedMonth"), value: money(payments.filter((p) => p.status === "succeeded" && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)), valueClassName: "text-success", footer: { icon: TrendingUp, text: t("biCollectedHint") } },
    { key: "overdue", title: t("biOverdue"), value: money(invoices.filter((i) => i.status === "overdue" || i.status === "partly_paid").reduce((s, i) => s + balance(i), 0)), valueClassName: "text-destructive", footer: { icon: Warning, text: t("biOverdueHint", { count: invoices.filter((i) => i.status === "overdue").length }) } },
    { key: "credits", title: t("biCreditNotes"), value: notes.length, footer: { icon: ReceiptText, text: t("biCreditNotesHint") } },
  ]

  const doExport = () =>
    exportToCsv(
      rows.map((i) => ({ number: i.number, date: i.date, due: i.dueDate, customer: i.customerName, ice: i.customerIce ?? "", subtotal: i.subtotal, vat: i.vat, total: i.total, paid: i.paid, credited: i.credited, status: t(`biInv_${i.status}`) })),
      `nexora-invoices-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "number", label: t("biNumber") }, { key: "date", label: t("biDate") }, { key: "due", label: t("biDue") }, { key: "customer", label: t("pfCompany") }, { key: "ice", label: "ICE" },
        { key: "subtotal", label: t("biSubtotal") }, { key: "vat", label: t("biVat") }, { key: "total", label: t("biTotal") }, { key: "paid", label: t("biPaid") }, { key: "credited", label: t("biCredited") }, { key: "status", label: t("status") },
      ]
    )

  const creditTotal = round2(Number(form.amount || 0) * (1 + (crediting?.lines[0]?.vatRate ?? 20) / 100))
  const submitCredit = () => crediting && m.creditNote.mutate({ invoiceId: crediting.id, amount: Number(form.amount), reason: form.reason, refund: form.refund }, { onSuccess: () => { setCrediting(null); setOpen(null) } })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={<Button variant="outline" onClick={doExport} disabled={rows.length === 0}><DownloadIcon className="size-4" />{t("biExport")}</Button>} />
      <MetricCardGrid cards={cards} />
      <Panel
        title={t("biInvoices")}
        hint={t("biInvoicesHint")}
        actions={
          <div className="flex flex-wrap gap-2">
            <Input className="w-60" placeholder={t("biSearch")} aria-label={t("biSearch")} value={query} onChange={(e) => setQuery(e.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40" aria-label={t("status")}><SelectValue>{status === ALL ? t("pfAllStatuses") : t(`biInv_${status}`)}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("pfAllStatuses")}</SelectItem>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`biInv_${s}`)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        }
      >
        {isLoading ? <ListSkeleton /> : rows.length === 0 ? <EmptyState icon={Receipt} title={t("biNoInvoice")} /> : (
          <TableContainer>
            <Table className="min-w-[56rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>{t("biNumber")}</TableHead>
                  <TableHead>{t("pfCompany")}</TableHead>
                  <TableHead>{t("biDate")}</TableHead>
                  <TableHead>{t("biDue")}</TableHead>
                  <TableHead className="text-end">{t("biTotal")}</TableHead>
                  <TableHead className="text-end">{t("biLeft")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => setOpen(i)}>
                    <TableCell><button type="button" className="rounded font-mono text-xs font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={(e) => { e.stopPropagation(); setOpen(i) }}>{i.number}</button>{i.kind === "proration" && <span className="block text-xs text-muted-foreground">{t("biProration")}</span>}</TableCell>
                    <TableCell>{i.customerName}</TableCell>
                    <TableCell className="text-sm">{date(i.date)}</TableCell>
                    <TableCell className="text-sm">{date(i.dueDate)}</TableCell>
                    <TableCell className="text-end tabular-nums">{money(i.total)}</TableCell>
                    <TableCell className="text-end tabular-nums">{balance(i) > 0 ? money(balance(i)) : "—"}</TableCell>
                    <TableCell><InvoiceStatusBadge status={i.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      <Panel title={t("biCreditNotes")} hint={t("biCreditNotesList")}>
        {notes.length === 0 ? <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">{t("biNoCredit")}</p> : (
          <TableContainer>
            <Table>
              <TableHeader><TableRow><TableHead>{t("biNumber")}</TableHead><TableHead>{t("biForInvoice")}</TableHead><TableHead>{t("pfCompany")}</TableHead><TableHead>{t("cuReason")}</TableHead><TableHead className="text-end">{t("biTotal")}</TableHead></TableRow></TableHeader>
              <TableBody>
                {notes.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-xs">{n.number}<span className="block text-muted-foreground">{date(n.date)}</span></TableCell>
                    <TableCell className="font-mono text-xs">{n.invoiceNumber}</TableCell>
                    <TableCell>{n.customerName}</TableCell>
                    <TableCell className="max-w-72 text-sm">{n.reason}<span className="block text-xs text-muted-foreground">{n.createdBy}</span></TableCell>
                    <TableCell className="text-end tabular-nums">−{money(n.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Panel>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-mono">{open.number}</SheetTitle>
                <SheetDescription>{open.customerName}{open.customerIce ? ` · ICE ${open.customerIce}` : ""}</SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 pb-6 text-sm">
                <div className="flex flex-wrap items-center gap-2"><InvoiceStatusBadge status={open.status} /><Badge variant="outline">{t(`biEinv_${open.einvoice}`)}</Badge></div>
                {open.seller && <p className="text-xs text-muted-foreground">{t("biIssuedBy", { name: open.seller.legalName, ice: open.seller.ice, rib: open.seller.rib })}</p>}
                <dl className="grid grid-cols-2 gap-3">
                  {[[t("biDate"), date(open.date)], [t("biDue"), date(open.dueDate)], [t("subPeriod"), `${date(open.periodFrom)} → ${date(open.periodTo)}`], [t("biLeft"), money(balance(open))]].map(([k, v]) => (
                    <div key={k} className="rounded-2xl border border-border p-3"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="mt-0.5 font-medium">{v}</dd></div>
                  ))}
                </dl>
                <ul className="divide-y divide-border rounded-2xl border border-border">
                  {open.lines.map((l, i) => <li key={i} className="flex gap-3 p-3"><span className="flex-1">{l.label}<span className="block text-xs text-muted-foreground">{t("biVatRate", { rate: l.vatRate })}</span></span><span className="tabular-nums">{money(l.quantity * l.unitPrice)}</span></li>)}
                  <li className="flex justify-between p-3"><span>{t("biSubtotal")}</span><span className="tabular-nums">{money(open.subtotal)}</span></li>
                  <li className="flex justify-between p-3"><span>{t("biVat")}</span><span className="tabular-nums">{money(open.vat)}</span></li>
                  <li className="flex justify-between p-3 font-semibold"><span>{t("biTotal")}</span><span className="tabular-nums">{money(open.total)}</span></li>
                </ul>
                <div>
                  <h3 className="mb-2 font-semibold">{t("biPayments")}</h3>
                  <ul className="flex flex-col gap-1">
                    {payments.filter((p) => p.invoiceId === open.id).map((p) => <li key={p.id} className="flex justify-between rounded-xl bg-muted/50 px-3 py-2"><span>{date(p.date)} · {t(p.method === "card" ? "subCard" : "subTransfer")} · {t(`biPay_${p.status}`)}</span><span className="tabular-nums">{money(p.amount)}</span></li>)}
                    {payments.every((p) => p.invoiceId !== open.id) && <li className="text-muted-foreground">{t("biNoPayment")}</li>}
                  </ul>
                </div>
                <Link href={`/dashboard/platform/${open.customerId}`} className="text-primary hover:underline">{t("biOpenCustomer")}</Link>
                {canCredit && open.status !== "credited" && (
                  <Button variant="outline" onClick={() => { setCrediting(open); setForm({ amount: "", reason: "", refund: false }) }}>{t("biIssueCredit")}</Button>
                )}
                <p className="text-xs text-muted-foreground">{t("biImmutable")}</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <DataTableEntityFormSheet
        open={!!crediting}
        onOpenChange={(v) => !v && setCrediting(null)}
        mode="create"
        createTitle={crediting ? t("biCreditTitle", { number: crediting.number }) : ""}
        editTitle=""
        description={t("biCreditDesc")}
        isSubmitting={m.creditNote.isPending}
        submitLabel={{ create: t("biIssueCredit") }}
        onSubmit={() => (form.refund && needsStepUp(actor?.role, creditTotal > REFUND_SECOND_APPROVAL_ABOVE ? C.REFUND_LARGE : C.REFUND_SMALL) ? setStepUp(true) : submitCredit())}
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cr-amount">{t("biCreditAmount")}</Label>
            <Input id="cr-amount" type="number" min={0.01} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            {Number(form.amount) > 0 && <p className="text-xs text-muted-foreground">{t("biCreditWithVat", { total: money(creditTotal) })}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cr-reason">{t("cuReason")}</Label>
            <Textarea id="cr-reason" rows={3} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border p-3">
            <Label htmlFor="cr-refund" className="flex-1">{t("biRefundToo")}<span className="block text-xs font-normal text-muted-foreground">{t("biRefundRule")}</span></Label>
            <Switch id="cr-refund" checked={form.refund} onCheckedChange={(v) => setForm({ ...form, refund: v })} />
          </div>
        </div>
      </DataTableEntityFormSheet>
      <StepUpDialog open={stepUp} onOpenChange={setStepUp} action={t("biStepUpRefund", { total: money(creditTotal) })} onConfirmed={submitCredit} />
    </div>
  )
}

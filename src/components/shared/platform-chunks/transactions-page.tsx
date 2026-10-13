"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowLeftRight, CheckCircle, Landmark, Plus, Warning } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { SortableHead, TablePager, useTableControls } from "@/components/shared/table-controls"
import type { Sorters } from "@/lib/ui/table-sort"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { useConsoleActor } from "@/hooks/platform/use-platform-console"
import { useBillingMutations, useNxDunning, useNxInvoices, useNxPayments, useNxRefunds } from "@/hooks/platform/use-platform-billing"
import { consoleCan, needsStepUp } from "@/lib/platform/console-roles"
import { DUNNING_PAUSE_MAX_DAYS, dunningClock, dunningStage, isoOf, round2 } from "@/lib/platform/billing"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { ConsoleCapability as C } from "@/types/platform-console"
import type { NxInvoice, NxPayment } from "@/types/platform-billing"
import { StepUpDialog } from "./console-shared"
import { Panel, useBillingFormat } from "./billing-shared"

const PAY_CLASS: Record<NxPayment["status"], string> = {
  succeeded: "bg-success-soft text-success-foreground",
  failed: "bg-danger-soft text-destructive",
  refunded: "bg-muted text-muted-foreground",
  unmatched: "bg-warning-soft text-warning-foreground",
  chargeback: "bg-danger-soft text-destructive",
}

/** Money between customers and Nexora: payments, failures, refunds, the transfer queue and dunning (PAY-01 to PAY-09). */
const SORTERS: Sorters<NxPayment> = { date: (p) => p.date, company: (p) => p.customerName ?? p.payer, invoice: (p) => p.invoiceNumber, method: (p) => p.method, amount: (p) => p.amount, status: (p) => p.status }

export default function ConsoleTransactionsPage() {
  const t = useTranslations()
  const { money, date } = useBillingFormat()
  const actor = useConsoleActor()
  const { data: payments = [], isLoading } = useNxPayments()
  const { data: invoices = [] } = useNxInvoices()
  const { data: refunds = [] } = useNxRefunds()
  const { data: dunning = [] } = useNxDunning()
  const m = useBillingMutations()
  const today = isoOf(new Date())
  const [recording, setRecording] = useState(false)
  const [form, setForm] = useState({ amount: "", reference: "", payer: "", date: today })
  const [assignTo, setAssignTo] = useState<Record<string, string>>({})
  const [approving, setApproving] = useState<string | null>(null)
  const [charging, setCharging] = useState<NxPayment | null>(null)
  const [cb, setCb] = useState({ reason: "", date: today })
  const [pausing, setPausing] = useState<NxInvoice | null>(null)
  const [pause, setPause] = useState({ days: "7", reason: "" })
  const canPause = consoleCan(actor?.role, C.CHANGE_SUBSCRIPTION)
  const canRecord = consoleCan(actor?.role, C.CREDIT_NOTES)
  const canApprove = consoleCan(actor?.role, C.REFUND_LARGE)
  const queue = payments.filter((p) => p.status === "unmatched")
  const open = invoices.filter((i) => i.status === "issued" || i.status === "overdue" || i.status === "partly_paid")
  const waiting = refunds.filter((r) => r.status === "awaiting_approval")
  const overdue = invoices.filter((i) => i.status === "overdue" && i.failedOn)
  const ledger = payments.filter((p) => p.status !== "unmatched")
  const ctl = useTableControls(ledger, SORTERS, { key: "date", dir: "desc" })
  const month = today.slice(0, 7)

  const cards: MetricCardItem[] = [
    { key: "in", title: t("trReceived"), value: money(payments.filter((p) => p.status === "succeeded" && p.date.startsWith(month)).reduce((s, p) => s + p.amount, 0)), valueClassName: "text-success", footer: { icon: CheckCircle, text: t("trThisMonth") } },
    { key: "failed", title: t("trFailed"), value: payments.filter((p) => p.status === "failed" && p.date.startsWith(month)).length, valueClassName: "text-destructive", footer: { icon: Warning, text: t("trFailedHint") } },
    { key: "queue", title: t("trQueue"), value: queue.length, valueClassName: queue.length ? "text-warning-foreground" : undefined, footer: { icon: Landmark, text: t("trQueueHint") } },
    { key: "refunds", title: t("trRefundsWaiting"), value: waiting.length, footer: { icon: ArrowLeftRight, text: t("trRefundsHint") } },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={canRecord ? <Button onClick={() => setRecording(true)}><Plus className="size-4" />{t("trRecordTransfer")}</Button> : undefined} />
      <MetricCardGrid cards={cards} />

      {overdue.length > 0 && (
        <Panel title={t("trDunning")} hint={t("trDunningHint")}>
          <ul className="flex flex-col gap-3">
            {overdue.map((i) => {
              const days = dunningClock(i.failedOn!, today, i.dunningPause)
              const paused = i.dunningPause && today < i.dunningPause.until
              const runs = dunning.filter((d) => d.invoiceId === i.id).sort((a, b) => a.day - b.day)
              return (
                <li key={i.id} className="rounded-2xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{i.customerName}</span>
                    <span className="font-mono text-xs text-muted-foreground">{i.number}</span>
                    <span className="ms-auto tabular-nums">{money(round2(i.total - i.paid - i.credited))}</span>
                    <Badge variant="outline" className="border-transparent bg-danger-soft text-destructive">{t("trDay", { day: days })} · {t(`trStage_${dunningStage(days)}`)}</Badge>
                    {i.method === "transfer" && <Badge variant="outline">{t("subTransfer")}</Badge>}
                    {paused && <Badge variant="outline" className="border-transparent bg-warning-soft text-warning-foreground">{t("trPausedUntil", { date: date(i.dunningPause!.until) })}</Badge>}
                    {canPause && !i.dunningPause && <Button size="sm" variant="outline" onClick={() => { setPause({ days: "7", reason: "" }); setPausing(i) }}>{t("trPause")}</Button>}
                  </div>
                  {i.dunningPause && <p className="mt-1 text-xs text-muted-foreground">{t("trPauseLine", { by: i.dunningPause.by, from: date(i.dunningPause.from), until: date(i.dunningPause.until), reason: i.dunningPause.reason })}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{runs.map((r) => `${t("trDay", { day: r.day })}: ${t(`trKind_${r.kind}`)}${r.kind === "retry" ? ` (${r.result})` : ""}`).join(" · ") || t("trNoStepYet")}</p>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      {(queue.length > 0 || waiting.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <Panel title={t("trQueue")} hint={t("trQueueList")}>
            {queue.length === 0 ? <p className="text-sm text-muted-foreground">{t("trQueueEmpty")}</p> : (
              <ul className="flex flex-col gap-3">
                {queue.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-border p-3 text-sm">
                    <div className="flex justify-between gap-2"><span className="font-medium">{p.payer ?? "—"}</span><span className="tabular-nums">{money(p.amount)}</span></div>
                    <p className="text-xs text-muted-foreground">{date(p.date)} · {p.reference}</p>
                    {canRecord && (
                      <div className="mt-2 flex gap-2">
                        <Select value={assignTo[p.id] ?? ""} onValueChange={(v) => setAssignTo({ ...assignTo, [p.id]: v })}>
                          <SelectTrigger className="flex-1" aria-label={t("trAssignTo")}><SelectValue placeholder={t("trAssignTo")}>{open.find((i) => i.id === assignTo[p.id])?.number}</SelectValue></SelectTrigger>
                          <SelectContent>{open.map((i) => <SelectItem key={i.id} value={i.id}>{i.number} · {i.customerName} · {money(round2(i.total - i.paid - i.credited))}</SelectItem>)}</SelectContent>
                        </Select>
                        <Button size="sm" disabled={!assignTo[p.id]} onClick={() => m.assign.mutate({ paymentId: p.id, invoiceId: assignTo[p.id]! })}>{t("trAssign")}</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t("trRefundsWaiting")} hint={t("trRefundsList")}>
            {waiting.length === 0 ? <p className="text-sm text-muted-foreground">{t("trNoRefund")}</p> : (
              <ul className="flex flex-col gap-3">
                {waiting.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border p-3 text-sm">
                    <div className="flex-1"><p className="font-medium">{r.customerName} · {money(r.amount)}</p><p className="text-xs text-muted-foreground">{r.creditNoteNumber} · {t("trAskedBy", { name: r.requestedBy })}</p></div>
                    {canApprove && r.requestedBy !== actor?.name && <Button size="sm" onClick={() => (needsStepUp(actor?.role, C.REFUND_LARGE) ? setApproving(r.id) : m.approveRefund.mutate(r.id))}>{t("trApprove")}</Button>}
                    {r.requestedBy === actor?.name && <span className="text-xs text-muted-foreground">{t("trNeedsOther")}</span>}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      <Panel title={t("trLedger")} hint={t("trLedgerHint")}>
        {isLoading ? <ListSkeleton /> : (
          <TableContainer>
            <Table className="min-w-[52rem]">
              <TableHeader>
                <TableRow>
                  <SortableHead label={t("biDate")} k="date" ctl={ctl} />
                  <SortableHead label={t("pfCompany")} k="company" ctl={ctl} />
                  <SortableHead label={t("biForInvoice")} k="invoice" ctl={ctl} />
                  <SortableHead label={t("subMethod")} k="method" ctl={ctl} />
                  <TableHead>{t("trReference")}</TableHead>
                  <SortableHead label={t("trAmount")} k="amount" ctl={ctl} align="end" />
                  <SortableHead label={t("status")} k="status" ctl={ctl} />
                  {canRecord && <TableHead>{t("actions")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {ctl.rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{date(p.date)}</TableCell>
                    <TableCell>{p.customerName ?? p.payer ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">{p.invoiceNumber ?? "—"}</TableCell>
                    <TableCell>{t(p.method === "card" ? "subCard" : "subTransfer")}</TableCell>
                    <TableCell className="max-w-48 truncate text-xs text-muted-foreground">{p.reference}</TableCell>
                    <TableCell className={cn("text-end tabular-nums", p.amount < 0 && "text-destructive")}>{money(p.amount)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("border-transparent", PAY_CLASS[p.status])}>{t(`biPay_${p.status}`)}</Badge>
                      {p.chargedBackOn && <span className="ms-2 text-xs text-destructive">{t("trChargedBackOn", { date: date(p.chargedBackOn) })}</span>}
                      {p.reason && <p className="mt-1 text-xs text-muted-foreground">{p.reason}</p>}
                    </TableCell>
                    {canRecord && (
                      <TableCell>
                        {p.status === "succeeded" && p.method === "card" && p.invoiceId && !p.chargedBackOn && (
                          <Button size="sm" variant="ghost" aria-label={t("trChargebackOf", { reference: p.reference })} onClick={() => { setCb({ reason: "", date: today }); setCharging(p) }}>{t("trChargeback")}</Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePager ctl={ctl} className="px-4 pb-3" />
          </TableContainer>
        )}
        <p className="mt-3 text-xs text-muted-foreground">{t("trCardNote")}</p>
      </Panel>

      <DataTableEntityFormSheet
        open={recording}
        onOpenChange={setRecording}
        mode="create"
        createTitle={t("trRecordTransfer")}
        editTitle=""
        description={t("trRecordDesc")}
        isSubmitting={m.recordTransfer.isPending}
        submitLabel={{ create: t("trRecord") }}
        onSubmit={() => m.recordTransfer.mutate({ amount: Number(form.amount), reference: form.reference, payer: form.payer, date: form.date }, { onSuccess: () => { setRecording(false); setForm({ amount: "", reference: "", payer: "", date: today }) } })}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="tr-amount">{t("trAmountTtc")}</Label><Input id="tr-amount" type="number" step="0.01" min={0.01} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="tr-date">{t("biDate")}</Label><Input id="tr-date" type="date" max={today} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="tr-ref">{t("trReference")}</Label><Input id="tr-ref" placeholder="VIR NX-2026-00012" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr-payer">{t("trPayer")}</Label><Input id="tr-payer" value={form.payer} onChange={(e) => setForm({ ...form, payer: e.target.value })} /></div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("trMatchRule")}</p>
        </div>
      </DataTableEntityFormSheet>
      <DataTableEntityFormSheet
        open={!!charging}
        onOpenChange={(v) => !v && setCharging(null)}
        mode="create"
        createTitle={t("trChargebackTitle")}
        editTitle=""
        description={charging ? t("trChargebackDesc", { number: charging.invoiceNumber ?? "—", amount: money(charging.amount), company: charging.customerName ?? "—" }) : ""}
        isSubmitting={m.chargeback.isPending}
        submitLabel={{ create: t("trChargebackRecord") }}
        onSubmit={() => charging && m.chargeback.mutate({ paymentId: charging.id, reason: cb.reason, date: cb.date }, { onSuccess: () => setCharging(null) })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="cb-reason">{t("trChargebackReason")}</Label><Input id="cb-reason" placeholder={t("trChargebackReasonPh")} value={cb.reason} onChange={(e) => setCb({ ...cb, reason: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cb-date">{t("biDate")}</Label><Input id="cb-date" type="date" max={today} value={cb.date} onChange={(e) => setCb({ ...cb, date: e.target.value })} /></div>
          <p className="rounded-2xl bg-warning-soft p-3 text-xs text-warning-foreground">{t("trChargebackRule")}</p>
        </div>
      </DataTableEntityFormSheet>
      <DataTableEntityFormSheet
        open={!!pausing}
        onOpenChange={(v) => !v && setPausing(null)}
        mode="create"
        createTitle={t("trPauseTitle")}
        editTitle=""
        description={pausing ? t("trPauseDesc", { number: pausing.number, company: pausing.customerName }) : ""}
        isSubmitting={m.pauseDunning.isPending}
        submitLabel={{ create: t("trPause") }}
        onSubmit={() => pausing && m.pauseDunning.mutate({ invoiceId: pausing.id, days: Number(pause.days), reason: pause.reason }, { onSuccess: () => setPausing(null) })}
      >
        <div className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="pa-days">{t("trPauseDays")}</Label><Input id="pa-days" type="number" min={1} max={DUNNING_PAUSE_MAX_DAYS} step={1} value={pause.days} onChange={(e) => setPause({ ...pause, days: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="pa-reason">{t("trPauseReason")}</Label><Textarea id="pa-reason" rows={3} placeholder={t("trPauseReasonPh")} value={pause.reason} onChange={(e) => setPause({ ...pause, reason: e.target.value })} /></div>
          <p className="rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("trPauseRule")}</p>
        </div>
      </DataTableEntityFormSheet>
      <StepUpDialog open={!!approving} onOpenChange={(v) => !v && setApproving(null)} action={t("trApproveStepUp")} onConfirmed={() => approving && m.approveRefund.mutate(approving)} />
    </div>
  )
}

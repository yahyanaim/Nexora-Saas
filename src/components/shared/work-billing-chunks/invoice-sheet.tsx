"use client"

import { CURRENCIES } from "@/lib/workforce/currency"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertTriangle, Ban, CheckCircle2, DownloadIcon, FileText, Plus, RotateCcw, Send, Trash2 } from "@/components/ui/carbon/icons"
import { createId } from "@/lib/workforce/demo-store"
import { creditedAmount, displayStatus, invoiceBalance, invoiceTotals } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { invoiceIdProblems } from "@/lib/workforce/tax-ids"
import { translateError } from "@/lib/errors/translate-error"
import type { Client } from "@/types/workforce"
import type { CompanySettings } from "@/types/work-settings"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { downloadClientInvoicePdf } from "@/lib/pdf/generate-client-invoice-pdf"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { Link } from "@/i18n/navigation"
import { ClientInvoiceStatus, InvoiceKind, PaymentMethod, type ClientInvoice, type InvoiceLine, type Payment } from "@/types/work-billing"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL } from "./billing-labels"
import { EInvoicePanel } from "./e-invoice-panel"

const DEFAULT_RATE = "__default__"

type DraftPatch = Partial<Pick<ClientInvoice, "taxRate" | "lines" | "withholdingRate" | "currency" | "exchangeRate" | "exchangeRateDate">>

interface Props {
  invoice: ClientInvoice | null
  /** Every invoice of the workspace, to show credit notes against this one */
  allInvoices: ClientInvoice[]
  client?: Client
  company?: CompanySettings
  canEdit: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSaveDraft: (id: string, input: DraftPatch) => void
  onIssue: (id: string) => void
  onSend: (id: string) => void
  onPayment: (id: string, payment: Omit<Payment, "id">) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
  onCreditNote: (id: string, input: { lineIds?: string[]; releaseHours: boolean; reason?: string }) => void
  onOpenInvoice: (id: string) => void
}

/** An invoice or credit note: lines, taxes, payments, and the actions its status allows. */
export function InvoiceSheet(props: Props) {
  const { invoice, allInvoices, client, company, canEdit, busy, onOpenChange, onSaveDraft, onIssue, onSend, onPayment, onVoid, onDelete, onCreditNote, onOpenInvoice } = props
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const [downloading, setDownloading] = useState(false)
  const { data: projects = [] } = useProjects()
  const { data: quotes = [] } = useQuotes()
  const sourceQuote = invoice?.quoteId ? quotes.find((q) => q.id === invoice.quoteId) : undefined
  const [confirm, setConfirm] = useState<"void" | "delete" | null>(null)
  const [crediting, setCrediting] = useState(false)
  const [lineDesc, setLineDesc] = useState("")
  const [lineQty, setLineQty] = useState("1")
  const [linePrice, setLinePrice] = useState("")
  // The page remounts this sheet whenever the invoice changes, which resets these fields
  const [tax, setTax] = useState(invoice ? String(invoice.taxRate) : "")
  const [withholding, setWithholding] = useState(invoice?.withholdingRate ? String(invoice.withholdingRate) : "")
  const [rate, setRate] = useState(invoice?.exchangeRate ? String(invoice.exchangeRate) : "")
  const [payment, setPayment] = useState({ date: todayIso(), amount: "", method: PaymentMethod.BANK_TRANSFER, reference: "" })

  if (!invoice) return null

  const isCredit = invoice.kind === InvoiceKind.CREDIT_NOTE
  const status = displayStatus(invoice, todayIso(), allInvoices)
  const isDraft = invoice.status === ClientInvoiceStatus.DRAFT
  const isOpen = invoice.status === ClientInvoiceStatus.ISSUED || invoice.status === ClientInvoiceStatus.SENT
  const editable = isDraft && canEdit
  const totals = invoiceTotals(invoice)
  const credited = creditedAmount(invoice, allInvoices)
  const balance = invoiceBalance(invoice, allInvoices)
  const baseCurrency = company?.baseCurrency ?? workspace.currency
  // Missing ICE / IF: the invoice can't be issued yet (Phase 6e.1)
  const idProblems = company ? invoiceIdProblems(company, client) : []
  const foreign = invoice.currency !== baseCurrency
  const money = (n: number) => formatMoney(n, invoice.currency, locale)
  const creditNotes = allInvoices.filter((x) => x.creditNoteFor === invoice.id)
  const original = invoice.creditNoteFor ? allInvoices.find((x) => x.id === invoice.creditNoteFor) : undefined

  const addLine = () => {
    const quantity = Number(lineQty)
    const unitPrice = Number(linePrice)
    if (!lineDesc.trim() || !(quantity > 0) || !(unitPrice >= 0)) return
    onSaveDraft(invoice.id, {
      lines: [...invoice.lines, { id: createId("ln"), description: lineDesc.trim(), quantity, unitPrice, timeEntryIds: [] }],
    })
  }
  const setLineTax = (line: InvoiceLine, value: string) =>
    onSaveDraft(invoice.id, {
      lines: invoice.lines.map((l) => (l.id === line.id ? { ...l, taxRate: value === DEFAULT_RATE ? undefined : Number(value) } : l)),
    })
  const ratesInUse = [...new Set([invoice.taxRate, 20, 14, 10, 7, 0, ...invoice.lines.map((l) => l.taxRate).filter((r): r is number => r !== undefined)])]

  const download = async () => {
    setDownloading(true)
    try {
      await downloadClientInvoicePdf({ invoice, allInvoices, client, workspace, company, projects, balance, locale, quoteNumber: sourceQuote?.number })
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          {/* Number, status and the PDF button on one line */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <SheetTitle className="truncate font-mono">{invoice.number || t("draftInvoice")}</SheetTitle>
              {isCredit && <Badge variant="outline">{t("creditNote")}</Badge>}
              <Badge variant="outline" className={cn("shrink-0", INVOICE_STATUS_CLASS[status])}>
                {t(INVOICE_STATUS_LABEL[status])}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" disabled={downloading} onClick={download}>
              <DownloadIcon className="size-4" />
              {t("downloadPdf")}
            </Button>
          </div>
          <SheetDescription>{client?.name ?? "—"}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          {sourceQuote && (
            <Link href="/dashboard/quotes" className="rounded-xl bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted">
              {t("invoiceFromQuote", { number: sourceQuote.number })}
            </Link>
          )}
          {original && (
            <button type="button" onClick={() => onOpenInvoice(original.id)} className="rounded-xl bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted">
              {t("creditNoteFor", { number: original.number })}
            </button>
          )}

          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{t("issueDate")}</dt><dd className="font-medium">{formatShortDate(invoice.issueDate, locale)}</dd></div>
            {!isCredit && <div><dt className="text-xs text-muted-foreground">{t("dueDate")}</dt><dd className={status === "overdue" ? "font-medium text-destructive" : "font-medium"}>{formatShortDate(invoice.dueDate, locale)}</dd></div>}
            {invoice.paidAt && <div><dt className="text-xs text-muted-foreground">{t("paidOn")}</dt><dd className="font-medium">{formatShortDate(invoice.paidAt.slice(0, 10), locale)}</dd></div>}
            <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">{t("billTo")}</dt>
              <dd className="font-medium">{client?.legalName ?? client?.name}{client?.ice ? ` · ICE ${client.ice}` : client?.taxId ? ` · ${client.taxId}` : ""}</dd>
              <dd className="text-muted-foreground">{[client?.billingAddress ?? client?.address, client?.email].filter(Boolean).join(" · ")}</dd>
            </div>
          </dl>

          {editable && (
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-border p-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label>{t("currency")}</Label>
                <Select value={invoice.currency} onValueChange={(v) => onSaveDraft(invoice.id, { currency: v })}>
                  <SelectTrigger className="w-full bg-card"><SelectValue>{invoice.currency}</SelectValue></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {foreign && (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="fx">{t("exchangeRateTo", { base: baseCurrency })}</Label>
                  <Input
                    id="fx"
                    inputMode="decimal"
                    value={rate}
                    placeholder="0.000000"
                    onChange={(e) => setRate(e.target.value)}
                    onBlur={() => {
                      const value = Number(rate)
                      if (value > 0 && value !== invoice.exchangeRate) onSaveDraft(invoice.id, { exchangeRate: value, exchangeRateDate: todayIso() })
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="wh">{t("withholdingPercent")}</Label>
                <Input
                  id="wh"
                  inputMode="decimal"
                  value={withholding}
                  placeholder="0"
                  onChange={(e) => setWithholding(e.target.value)}
                  onBlur={() => {
                    const value = withholding.trim() === "" ? 0 : Number(withholding)
                    if (Number.isFinite(value) && value >= 0 && value <= 100 && value !== (invoice.withholdingRate ?? 0)) onSaveDraft(invoice.id, { withholdingRate: value || undefined })
                  }}
                />
              </div>
            </div>
          )}

          <div className="relative overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("description")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("quantity")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("rate")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("tax")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("amount")}</th>
                  {editable && <th className="w-8"><span className="sr-only">{t("actions")}</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="px-3 py-2">{line.description}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{line.timeEntryIds.length ? `${line.quantity} h` : line.quantity}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(line.unitPrice)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {editable ? (
                        <div className="ms-auto w-24">
                          <Select value={line.taxRate === undefined ? DEFAULT_RATE : String(line.taxRate)} onValueChange={(v) => setLineTax(line, v)}>
                            <SelectTrigger className="h-8 w-full bg-card text-xs" aria-label={t("lineTax")}>
                              <SelectValue>{`${line.taxRate ?? invoice.taxRate}%`}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={DEFAULT_RATE}>{t("invoiceRate", { rate: invoice.taxRate })}</SelectItem>
                              {ratesInUse.map((r) => <SelectItem key={r} value={String(r)}>{r === 0 ? t("exempt") : `${r}%`}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        `${line.taxRate ?? invoice.taxRate}%`
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{money(line.quantity * line.unitPrice)}</td>
                    {editable && (
                      <td className="pe-1">
                        {line.timeEntryIds.length === 0 && !line.expenseIds?.length && (
                          <Button variant="ghost" size="sm" aria-label={t("removeLine")} onClick={() => onSaveDraft(invoice.id, { lines: invoice.lines.filter((l) => l.id !== line.id) })}>
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editable && (
            <form
              className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3"
              onSubmit={(e) => {
                e.preventDefault()
                addLine()
              }}
            >
              <p className="text-sm font-medium">{t("addManualLine")}</p>
              <div className="grid grid-cols-[1fr_5rem_7rem_auto] gap-2">
                <Input aria-label={t("description")} placeholder={t("manualLinePlaceholder")} value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} />
                <Input aria-label={t("quantity")} inputMode="decimal" value={lineQty} onChange={(e) => setLineQty(e.target.value)} />
                <Input aria-label={t("unitPrice")} inputMode="decimal" placeholder={t("unitPrice")} value={linePrice} onChange={(e) => setLinePrice(e.target.value)} />
                <Button type="submit" variant="outline" aria-label={t("addLine")}>
                  <Plus className="size-4" />
                </Button>
              </div>
            </form>
          )}

          <dl className="ms-auto flex w-full max-w-sm flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
            {editable && (
              <div className="flex items-center justify-between gap-2">
                <dt className="text-muted-foreground">
                  <Label className="flex items-center gap-2 font-normal">
                    {t("defaultTax")}
                    <Input
                      className="h-8 w-16"
                      inputMode="decimal"
                      value={tax}
                      onChange={(e) => setTax(e.target.value)}
                      onBlur={() => {
                        const value = Number(tax)
                        if (Number.isFinite(value) && value >= 0 && value <= 100 && value !== invoice.taxRate) onSaveDraft(invoice.id, { taxRate: value })
                        else setTax(String(invoice.taxRate))
                      }}
                    />
                    %
                  </Label>
                </dt>
              </div>
            )}
            {totals.taxes.map((tx) => (
              <div key={tx.rate} className="flex justify-between">
                <dt className="text-muted-foreground">{tx.rate === 0 ? t("exemptOn", { base: money(tx.base) }) : t("taxOn", { rate: tx.rate, base: money(tx.base) })}</dt>
                <dd className="tabular-nums">{money(tx.amount)}</dd>
              </div>
            ))}
            {totals.withholding > 0 && (
              <div className="flex justify-between"><dt className="text-muted-foreground">{t("withholdingAmount", { rate: invoice.withholdingRate ?? 0 })}</dt><dd className="tabular-nums">−{money(totals.withholding)}</dd></div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><dt>{t("total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
            {totals.paid > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("paid")}</dt><dd className="tabular-nums">−{money(totals.paid)}</dd></div>}
            {credited > 0 && <div className="flex justify-between"><dt className="text-muted-foreground">{t("credited")}</dt><dd className="tabular-nums">−{money(credited)}</dd></div>}
            {!isCredit && !isDraft && invoice.status !== ClientInvoiceStatus.VOID && (
              <div className="flex justify-between font-semibold"><dt>{t("balanceDue")}</dt><dd className="tabular-nums">{money(balance)}</dd></div>
            )}
            {foreign && invoice.exchangeRate && (
              <p className="pt-1 text-xs text-muted-foreground">{t("fxNote", { currency: invoice.currency, rate: invoice.exchangeRate, base: baseCurrency })}</p>
            )}
          </dl>

          {(invoice.payments?.length ?? 0) > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t("payments")}</h3>
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
                {invoice.payments!.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span>
                      {formatShortDate(p.date, locale)} · {t(`method_${p.method}`)}
                      {p.reference && <span className="text-muted-foreground"> · {p.reference}</span>}
                    </span>
                    <span className="font-medium tabular-nums">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {canEdit && isOpen && !isCredit && balance > 0 && (
            <form
              className="flex flex-col gap-2 rounded-2xl border border-dashed border-border p-3"
              onSubmit={(e) => {
                e.preventDefault()
                onPayment(invoice.id, { date: payment.date, amount: Number(payment.amount), method: payment.method, reference: payment.reference })
              }}
            >
              <p className="text-sm font-medium">{t("recordPayment")}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Input type="date" aria-label={t("date")} value={payment.date} onChange={(e) => setPayment((p) => ({ ...p, date: e.target.value }))} />
                <Input inputMode="decimal" aria-label={t("amount")} placeholder={String(balance)} value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
                <Select value={payment.method} onValueChange={(v) => setPayment((p) => ({ ...p, method: v as PaymentMethod }))}>
                  <SelectTrigger className="w-full bg-card" aria-label={t("paymentMethod")}><SelectValue>{t(`method_${payment.method}`)}</SelectValue></SelectTrigger>
                  <SelectContent>{Object.values(PaymentMethod).map((m) => <SelectItem key={m} value={m}>{t(`method_${m}`)}</SelectItem>)}</SelectContent>
                </Select>
                <Input aria-label={t("bankReference")} placeholder={t("bankReference")} value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setPayment((p) => ({ ...p, amount: String(balance) }))}>{t("fullBalance")}</Button>
                <Button type="submit" size="sm" disabled={busy || !(Number(payment.amount) > 0)}>{t("recordPayment")}</Button>
              </div>
            </form>
          )}

          {creditNotes.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">{t("creditNotes")}</h3>
              {creditNotes.map((cn) => (
                <button key={cn.id} type="button" onClick={() => onOpenInvoice(cn.id)} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted">
                  <span className="font-mono">{cn.number}</span>
                  <span className="tabular-nums">{money(invoiceTotals(cn).total)}</span>
                </button>
              ))}
            </section>
          )}

          {(invoice.deliveries?.length ?? 0) > 0 && (
            <section className="flex flex-col gap-1 text-xs text-muted-foreground">
              <h3 className="text-sm font-medium text-foreground">{t("deliveryLog")}</h3>
              {invoice.deliveries!.map((d) => (
                <p key={d.at}>{t("sentTo", { to: d.to || "—", date: new Date(d.at).toLocaleString(locale) })}</p>
              ))}
            </section>
          )}

          {company && !isDraft && <EInvoicePanel invoice={invoice} company={company} client={client} canEdit={canEdit} />}

          {invoice.notes && <p className="whitespace-pre-line rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">{invoice.notes}</p>}
        </div>

        {canEdit && isDraft && idProblems.length > 0 && (
          <div role="alert" className="mx-6 mb-2 flex gap-2 rounded-2xl bg-warning-soft p-3 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
            <div>
              <p className="font-medium">{t("taxIdsMissingTitle")}</p>
              <ul className="mt-1 list-disc ps-4 text-muted-foreground">
                {idProblems.map((p) => <li key={p}>{translateError(new Error(p), t)}</li>)}
              </ul>
              <div className="mt-2 flex flex-wrap gap-3 font-medium">
                {idProblems.some((p) => p.includes("Settings")) && <Link href="/dashboard/settings" className="text-primary hover:underline">{t("openCompanySettings")}</Link>}
                {client && idProblems.some((p) => p.includes("client")) && <Link href={`/dashboard/clients?client=${client.id}`} className="text-primary hover:underline">{t("openClient")}</Link>}
              </div>
            </div>
          </div>
        )}

        {canEdit && invoice.status !== ClientInvoiceStatus.VOID && !isCredit && (
          <SheetFooter className="flex-row flex-wrap gap-2 border-t px-6 py-4">
            {isDraft ? (
              <>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirm("delete")}>
                  <Trash2 className="size-4" />
                  {t("deleteDraft")}
                </Button>
                <Button variant="outline" className="flex-1" disabled={busy || invoice.lines.length === 0 || idProblems.length > 0} onClick={() => onIssue(invoice.id)}>
                  <FileText className="size-4" />
                  {t("issueInvoice")}
                </Button>
                <Button className="flex-1" disabled={busy || invoice.lines.length === 0 || idProblems.length > 0} onClick={() => onSend(invoice.id)}>
                  <Send className="size-4" />
                  {t("issueAndSend")}
                </Button>
              </>
            ) : (
              <>
                {isOpen && !(invoice.payments?.length) && !invoice.eInvoice && (
                  <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirm("void")}>
                    <Ban className="size-4" />
                    {t("cancelInvoice")}
                  </Button>
                )}
                <Button variant="outline" className="flex-1" disabled={busy || credited >= totals.total} onClick={() => setCrediting(true)}>
                  <RotateCcw className="size-4" />
                  {t("creditNote")}
                </Button>
                {invoice.status === ClientInvoiceStatus.ISSUED && (
                  <Button variant="outline" className="flex-1" disabled={busy} onClick={() => onSend(invoice.id)}>
                    <Send className="size-4" />
                    {t("markAsSent")}
                  </Button>
                )}
                {isOpen && balance > 0 && (
                  <Button className="flex-1" disabled={busy} onClick={() => onPayment(invoice.id, { date: todayIso(), amount: balance, method: PaymentMethod.BANK_TRANSFER })}>
                    <CheckCircle2 className="size-4" />
                    {t("markAsPaid")}
                  </Button>
                )}
              </>
            )}
          </SheetFooter>
        )}

        {crediting && (
          <CreditNoteDialog
            invoice={invoice}
            allInvoices={allInvoices}
            money={money}
            onClose={() => setCrediting(false)}
            onConfirm={(input) => {
              onCreditNote(invoice.id, input)
              setCrediting(false)
            }}
          />
        )}

        <ConfirmAlertDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm === "void" ? t("cancelInvoice") : t("deleteDraft")}
          description={confirm === "void" ? t("cancelIssuedConfirmation", { number: invoice.number }) : t("deleteDraftConfirmation", { number: invoice.number || t("draftInvoice") })}
          confirmLabel={confirm === "void" ? t("cancelInvoice") : t("delete")}
          destructive
          onConfirm={() => {
            if (confirm === "void") onVoid(invoice.id)
            else onDelete(invoice.id)
            setConfirm(null)
          }}
        />
      </SheetContent>
    </Sheet>
  )
}

/** Pick the lines to credit and whether their hours go back to unbilled (BIL-10). */
function CreditNoteDialog({
  invoice,
  allInvoices,
  money,
  onClose,
  onConfirm,
}: {
  invoice: ClientInvoice
  allInvoices: ClientInvoice[]
  money: (n: number) => string
  onClose: () => void
  onConfirm: (input: { lineIds: string[]; releaseHours: boolean; reason?: string }) => void
}) {
  const t = useTranslations()
  const credited = new Set(
    allInvoices.filter((x) => x.creditNoteFor === invoice.id && x.status !== ClientInvoiceStatus.VOID).flatMap((x) => x.lines.map((l) => l.id.replace(/^cn-/, "")))
  )
  const available = invoice.lines.filter((l) => !credited.has(l.id))
  const [picked, setPicked] = useState<string[]>(available.map((l) => l.id))
  const [releaseHours, setReleaseHours] = useState(true)
  const [reason, setReason] = useState("")

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("creditNote")}</DialogTitle>
          <DialogDescription>{t("creditNoteHint", { number: invoice.number })}</DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {available.map((l) => (
            <li key={l.id}>
              <label className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted">
                <Checkbox checked={picked.includes(l.id)} onCheckedChange={(on) => setPicked((p) => (on ? [...p, l.id] : p.filter((id) => id !== l.id)))} />
                <span className="flex-1">{l.description}</span>
                <span className="tabular-nums">{money(l.quantity * l.unitPrice)}</span>
              </label>
            </li>
          ))}
        </ul>
        <label className="flex items-center gap-3 text-sm">
          <Checkbox checked={releaseHours} onCheckedChange={(on) => setReleaseHours(on)} />
          {t("releaseHoursToBill")}
        </label>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("reason")} aria-label={t("reason")} />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("cancel")}</Button>
          <Button disabled={picked.length === 0} onClick={() => onConfirm({ lineIds: picked, releaseHours, reason })}>{t("issueCreditNote")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { Fragment, useMemo, useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { CheckCircle, Clock, Copy, DownloadIcon, FileText, FolderKanban, Pencil, Plus, Receipt, Send, Trash2, TrendingUp, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { useQuoteMutations, useQuotes } from "@/hooks/workforce/use-quotes"
import { acceptanceRate, lineTotal, quoteDisplayStatus, quoteTotals } from "@/lib/workforce/quotes"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { createId } from "@/lib/workforce/demo-store"
import { downloadQuotePdf } from "@/lib/pdf/generate-quote-pdf"
import { ClientStatus } from "@/types/workforce"
import { DEFAULT_QUOTE_VALIDITY_DAYS, FLAT_UNIT, QuoteStatus, type Quote, type QuoteDisplayStatus, type QuoteInput, type QuoteLine } from "@/types/work-quotes"
import { formatMoney, includesFilter } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"

export const QUOTE_STATUS_LABEL: Record<QuoteDisplayStatus, string> = {
  [QuoteStatus.DRAFT]: "draft",
  [QuoteStatus.SENT]: "quoteSent",
  [QuoteStatus.ACCEPTED]: "quoteAccepted",
  [QuoteStatus.DECLINED]: "quoteDeclined",
  expired: "quoteExpired",
  invoiced: "quoteInvoiced",
}
export const QUOTE_STATUS_CLASS: Record<QuoteDisplayStatus, string> = {
  [QuoteStatus.DRAFT]: "bg-muted text-muted-foreground border-transparent",
  [QuoteStatus.SENT]: "bg-info-soft text-info-foreground border-transparent",
  [QuoteStatus.ACCEPTED]: "bg-success-soft text-success-foreground border-transparent",
  [QuoteStatus.DECLINED]: "bg-danger-soft text-destructive border-transparent",
  expired: "bg-warning-soft text-warning-foreground border-transparent",
  invoiced: "bg-success-soft text-success-foreground border-transparent",
}
const UNITS = [FLAT_UNIT, "h", "days", "pages", "units", "months"]
const RATES = [20, 14, 10, 7, 0]

type FormLine = { id: string; description: string; quantity: string; unit: string; unitPrice: string }
type Form = { clientId: string; contactId: string; currency: string; issueDate: string; validUntil: string; deliveryDate: string; subject: string; taxRate: string; discountRate: string; notes: string; lines: FormLine[] }

const num = (v: string) => Number(v.replace(",", ".").trim())
const blankLine = (): FormLine => ({ id: createId("ql"), description: "", quantity: "1", unit: "h", unitPrice: "" })

/** Quotes (devis): pipeline, editor and the path from quote to invoice and project (QUO-1…QUO-6). */
export default function QuotesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const canEdit = can(authedUser, AdminPermissionsPlatform.INVOICES_CREATE)
  const { data: quotes = [], isLoading } = useQuotes()
  const { data: clients = [] } = useClients()
  const { data: invoices = [] } = useClientInvoices()
  const { data: projects = [] } = useProjects()
  const { data: employees = [] } = useEmployees()
  const { data: settings } = useWorkspaceSettings()
  const m = useQuoteMutations()
  const today = todayIso()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Quote | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [viewingId, setViewingId] = useState<string | null>(null)
  const [declining, setDeclining] = useState<Quote | null>(null)
  const [reason, setReason] = useState("")
  const [projectFor, setProjectFor] = useState<Quote | null>(null)
  const [projectCode, setProjectCode] = useState("")
  const [projectManager, setProjectManager] = useState("")
  const [deleting, setDeleting] = useState<Quote | null>(null)

  const viewing = quotes.find((q) => q.id === viewingId) ?? null
  const clientOf = (id: string) => clients.find((c) => c.id === id)
  const money = (n: number, currency = workspace.currency) => formatMoney(n, currency, locale)
  const status = (q: Quote) => quoteDisplayStatus(q, today)

  // ── Pipeline figures ──────────────────────────────────────────────
  const open = quotes.filter((q) => status(q) === QuoteStatus.SENT)
  const openValue = open.reduce((s, q) => s + quoteTotals(q).net, 0)
  const expiringSoon = open.filter((q) => q.validUntil <= addDays(today, 7)).length
  const rate = acceptanceRate(quotes)
  const won = quotes.filter((q) => q.status === QuoteStatus.ACCEPTED).reduce((s, q) => s + quoteTotals(q).net, 0)
  const cards: MetricCardItem[] = [
    { key: "open", title: t("quotesOpenValue"), value: money(openValue), valueClassName: "text-primary", footer: { icon: Clock, text: t("quotesAwaiting", { count: open.length }) } },
    { key: "expiring", title: t("quotesExpiringSoon"), value: expiringSoon, valueClassName: expiringSoon ? "text-warning-foreground" : undefined, footer: { icon: Clock, text: t("quotesExpiringHint") } },
    { key: "rate", title: t("quotesAcceptanceRate"), value: rate === null ? "—" : `${rate}%`, valueClassName: "text-success-foreground", footer: { icon: TrendingUp, text: t("quotesAcceptanceHint") } },
    { key: "won", title: t("quotesWonValue"), value: money(won), footer: { icon: CheckCircle, text: t("quotesWonHint") } },
  ]

  // ── Editor ────────────────────────────────────────────────────────
  const openForm = (quote: Quote | null, clientId?: string) => {
    setEditing(quote)
    const client = clientOf(quote?.clientId ?? clientId ?? "")
    setForm(
      quote
        ? {
            clientId: quote.clientId,
            contactId: quote.contactId ?? "",
            currency: quote.currency,
            issueDate: quote.issueDate,
            validUntil: quote.validUntil,
            deliveryDate: quote.deliveryDate ?? "",
            subject: quote.subject,
            taxRate: String(quote.taxRate),
            discountRate: String(quote.discountRate),
            notes: quote.notes ?? "",
            lines: quote.lines.map((l) => ({ id: l.id, description: l.description, quantity: String(l.quantity), unit: l.unit ?? "", unitPrice: String(l.unitPrice) })),
          }
        : {
            clientId: client?.id ?? "",
            contactId: "",
            currency: client?.currency ?? settings?.company.baseCurrency ?? workspace.currency,
            issueDate: today,
            validUntil: addDays(today, DEFAULT_QUOTE_VALIDITY_DAYS),
            deliveryDate: "",
            subject: "",
            taxRate: "20",
            discountRate: "0",
            notes: client ? t("quoteDefaultTerms", { days: client.paymentTermsDays }) : "",
            lines: [blankLine()],
          }
    )
    setFormOpen(true)
  }
  const toInput = (f: Form): QuoteInput => ({
    clientId: f.clientId,
    contactId: f.contactId || undefined,
    currency: f.currency,
    issueDate: f.issueDate,
    validUntil: f.validUntil,
    deliveryDate: f.deliveryDate || undefined,
    subject: f.subject,
    taxRate: num(f.taxRate),
    discountRate: num(f.discountRate || "0"),
    notes: f.notes,
    lines: f.lines.filter((l) => l.description.trim() || l.unitPrice).map<QuoteLine>((l) => ({ id: l.id, description: l.description, quantity: l.unit === FLAT_UNIT ? 1 : num(l.quantity), unit: l.unit || undefined, unitPrice: num(l.unitPrice) })),
  })
  const preview = form ? quoteTotals({ ...toInput(form), lines: toInput(form).lines.filter((l) => Number.isFinite(l.unitPrice) && Number.isFinite(l.quantity)) }) : null
  const setLine = (id: string, patch: Partial<FormLine>) => setForm((f) => (f ? { ...f, lines: f.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)) } : f))
  const submit = () => {
    if (!form) return
    const close = { onSuccess: (q: Quote) => { setFormOpen(false); setViewingId(q.id) } }
    if (editing) m.update.mutate({ id: editing.id, input: toInput(form) }, close)
    else m.create.mutate(toInput(form), close)
  }
  const formClient = form ? clientOf(form.clientId) : undefined

  const pdf = (q: Quote) => downloadQuotePdf({ quote: q, client: clientOf(q.clientId), workspace, company: settings?.company, locale })

  // ── Table ─────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<Quote>[]>(
    () => [
      {
        accessorKey: "subject",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("quote")} />,
        cell: ({ row }) => (
          <button type="button" onClick={() => setViewingId(row.original.id)} className="flex min-w-0 flex-col text-start">
            <span className="font-mono text-sm font-medium hover:text-primary">{row.original.number || t("draft")}</span>
            <span className="max-w-72 truncate text-xs text-muted-foreground">{row.original.subject}</span>
          </button>
        ),
      },
      {
        id: "client",
        accessorFn: (q) => clientOf(q.clientId)?.name ?? "—",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("client")} />,
        cell: ({ getValue }) => <span className="text-sm">{String(getValue())}</span>,
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("date")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatShortDate(row.original.issueDate, locale)}</span>,
      },
      {
        accessorKey: "validUntil",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("docExpires")} />,
        cell: ({ row }) => <span className="text-sm tabular-nums">{formatShortDate(row.original.validUntil, locale)}</span>,
      },
      {
        id: "total",
        accessorFn: (q) => quoteTotals(q).net,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("quoteAmountExcl")} />,
        cell: ({ row }) => <span className="text-sm font-medium tabular-nums">{money(quoteTotals(row.original).net, row.original.currency)}</span>,
      },
      {
        id: "status",
        accessorFn: (q) => status(q),
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("status")} />,
        cell: ({ row }) => {
          const s = status(row.original)
          return <Badge variant="outline" className={cn("shrink-0", QUOTE_STATUS_CLASS[s])}>{t(QUOTE_STATUS_LABEL[s])}</Badge>
        },
        filterFn: includesFilter,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, locale, clients, today]
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          canEdit && (
            <Button onClick={() => openForm(null)}>
              <Plus className="size-4" />
              {t("newQuote")}
            </Button>
          )
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <DataTable
        title={t("allQuotes")}
        isLoading={isLoading}
        columns={columns}
        data={quotes}
        searchColumnId="client"
        searchPlaceholder={t("searchByClient")}
        emptyMessage={t("noQuotes")}
        exportFilename="quotes"
        filters={[{ columnId: "status", title: t("status"), options: (Object.keys(QUOTE_STATUS_LABEL) as QuoteDisplayStatus[]).map((s) => ({ label: t(QUOTE_STATUS_LABEL[s]), value: s })) }]}
      />

      {/* ── Editor ── */}
      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        createTitle={t("newQuote")}
        editTitle={t("editQuote")}
        description={t("quoteFormHint")}
        submitLabel={{ create: t("saveDraft"), edit: t("saveDraft") }}
        isSubmitting={m.create.isPending || m.update.isPending}
        onSubmit={submit}
      >
        {form && (
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>{t("client")}</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => {
                    const c = clientOf(v)
                    setForm({ ...form, clientId: v, contactId: "", currency: c?.currency ?? form.currency, notes: form.notes || (c ? t("quoteDefaultTerms", { days: c.paymentTermsDays }) : "") })
                  }}
                >
                  <SelectTrigger className="w-full bg-card" aria-label={t("client")}><SelectValue placeholder={t("chooseClient")}>{formClient?.name}</SelectValue></SelectTrigger>
                  <SelectContent>
                    {clients.filter((c) => c.status !== ClientStatus.ARCHIVED).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("docContact")}</Label>
                <Select value={form.contactId || "__none__"} onValueChange={(v) => setForm({ ...form, contactId: v === "__none__" ? "" : v })}>
                  <SelectTrigger className="w-full bg-card" aria-label={t("docContact")} disabled={!formClient?.contacts.length}>
                    <SelectValue>{formClient?.contacts.find((c) => c.id === form.contactId)?.name ?? t("primaryContact")}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("primaryContact")}</SelectItem>
                    {formClient?.contacts.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-subject">{t("docProjectDescription")}</Label>
              <Textarea id="q-subject" rows={2} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder={t("quoteSubjectPlaceholder")} />
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-date">{t("docQuoteDate")}</Label>
                <Input id="q-date" type="date" value={form.issueDate} onChange={(e) => setForm({ ...form, issueDate: e.target.value, validUntil: form.validUntil < e.target.value ? addDays(e.target.value, DEFAULT_QUOTE_VALIDITY_DAYS) : form.validUntil })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-valid">{t("docExpires")}</Label>
                <Input id="q-valid" type="date" min={form.issueDate} value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-delivery">{t("docDeliveryDate")}</Label>
                <Input id="q-delivery" type="date" min={form.issueDate} value={form.deliveryDate} onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-cur">{t("currency")}</Label>
                <Input id="q-cur" value={form.currency} maxLength={3} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} />
              </div>
            </div>

            {/* Lines */}
            <div className="flex flex-col gap-2">
              <Label>{t("docTask")}</Label>
              <div className="flex flex-col gap-2">
                {form.lines.map((l) => (
                  <div key={l.id} className="grid grid-cols-12 items-center gap-2 rounded-2xl border border-border p-2">
                    <Input className="col-span-12" aria-label={t("description")} placeholder={t("description")} value={l.description} onChange={(e) => setLine(l.id, { description: e.target.value })} />
                    <Input className="col-span-3 text-right" aria-label={t("quantity")} inputMode="decimal" disabled={l.unit === FLAT_UNIT} value={l.unit === FLAT_UNIT ? "1" : l.quantity} onChange={(e) => setLine(l.id, { quantity: e.target.value })} />
                    <div className="col-span-4">
                      <Select value={UNITS.includes(l.unit) ? l.unit : l.unit ? l.unit : "h"} onValueChange={(v) => setLine(l.id, { unit: v })}>
                        <SelectTrigger className="w-full bg-card" aria-label={t("docQtyUnit")}><SelectValue>{l.unit === FLAT_UNIT ? t("docFlat") : t(`unit_${l.unit}`)}</SelectValue></SelectTrigger>
                        <SelectContent>{UNITS.map((u) => <SelectItem key={u} value={u}>{u === FLAT_UNIT ? t("docFlat") : t(`unit_${u}`)}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <Input className="col-span-4 text-right" aria-label={t("pdfUnitPrice")} placeholder={t("pdfUnitPrice")} inputMode="decimal" value={l.unitPrice} onChange={(e) => setLine(l.id, { unitPrice: e.target.value })} />
                    <Button variant="ghost" size="sm" className="col-span-1" aria-label={t("delete")} disabled={form.lines.length === 1} onClick={() => setForm({ ...form, lines: form.lines.filter((x) => x.id !== l.id) })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="self-start" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })}>
                  <Plus className="size-4" />
                  {t("addLine")}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("docVatRate")}</Label>
                <Select value={form.taxRate} onValueChange={(v) => setForm({ ...form, taxRate: v })}>
                  <SelectTrigger className="w-full bg-card" aria-label={t("docVatRate")}><SelectValue>{form.taxRate}%</SelectValue></SelectTrigger>
                  <SelectContent>{RATES.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="q-disc">{t("docDiscount")}</Label>
                <Input id="q-disc" inputMode="decimal" value={form.discountRate} onChange={(e) => setForm({ ...form, discountRate: e.target.value })} />
              </div>
            </div>
            {preview && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-2xl bg-muted/50 p-3 text-sm">
                <dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="text-right tabular-nums">{money(preview.subtotal, form.currency)}</dd>
                {preview.discount > 0 && (<><dt className="text-muted-foreground">{t("docDiscount")}</dt><dd className="text-right tabular-nums">-{money(preview.discount, form.currency)}</dd></>)}
                <dt className="text-muted-foreground">{t("pdfVat")}</dt><dd className="text-right tabular-nums">{money(preview.tax, form.currency)}</dd>
                <dt className="font-semibold">{t("total")}</dt><dd className="text-right font-semibold tabular-nums">{money(preview.total, form.currency)}</dd>
              </dl>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="q-notes">{t("docPaymentConditions")}</Label>
              <Textarea id="q-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      {/* ── Detail ── */}
      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewingId(null)}>
        <SheetContent className="flex flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl">
          {viewing && (() => {
            const s = status(viewing)
            const totals = quoteTotals(viewing)
            const client = clientOf(viewing.clientId)
            const invoice = invoices.find((i) => i.id === viewing.invoiceId)
            const project = projects.find((p) => p.id === viewing.projectId)
            const busy = Object.values(m).some((x) => x.isPending)
            return (
              <>
                <SheetHeader className="border-b px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <SheetTitle className="truncate font-mono">{viewing.number || t("draft")}</SheetTitle>
                      <Badge variant="outline" className={cn("shrink-0", QUOTE_STATUS_CLASS[s])}>{t(QUOTE_STATUS_LABEL[s])}</Badge>
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0" onClick={() => pdf(viewing)}>
                      <DownloadIcon className="size-4" /> {t("downloadPdf")}
                    </Button>
                  </div>
                  <SheetDescription>{client?.name} · {formatShortDate(viewing.issueDate, locale)} → {formatShortDate(viewing.validUntil, locale)}</SheetDescription>
                </SheetHeader>
                <div className="flex flex-1 flex-col gap-5 px-6 py-5">
                  <p className="rounded-2xl bg-muted/50 p-3 text-sm">{viewing.subject}</p>
                  <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border text-sm">
                    {viewing.lines.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <span className="min-w-0">
                          <span className="block truncate">{l.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {l.unit === FLAT_UNIT ? t("docFlat") : `${l.quantity} ${l.unit ? t(`unit_${l.unit}`) : ""}`} × {money(l.unitPrice, viewing.currency)}
                          </span>
                        </span>
                        <span className="tabular-nums">{money(lineTotal(l), viewing.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <dl className="grid grid-cols-2 gap-y-1 text-sm">
                    <dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="text-right tabular-nums">{money(totals.subtotal, viewing.currency)}</dd>
                    {totals.discount > 0 && (<><dt className="text-muted-foreground">{t("docDiscount").replace(/\s*\(%\)/, "")} {viewing.discountRate}%</dt><dd className="text-right tabular-nums">-{money(totals.discount, viewing.currency)}</dd></>)}
                    {totals.taxes.map((x) => (<Fragment key={x.rate}><dt className="text-muted-foreground">{t("pdfVat")} {x.rate}%</dt><dd className="text-right tabular-nums">{money(x.amount, viewing.currency)}</dd></Fragment>))}
                    <dt className="font-semibold">{t("total")}</dt><dd className="text-right font-semibold tabular-nums">{money(totals.total, viewing.currency)}</dd>
                  </dl>
                  {viewing.declineReason && <p className="rounded-2xl bg-danger-soft p-3 text-sm text-destructive">{t("quoteDeclinedBecause", { reason: viewing.declineReason })}</p>}
                  {(invoice || project) && (
                    <div className="flex flex-col gap-2 rounded-2xl border border-border p-3 text-sm">
                      {invoice && (
                        <Link href="/dashboard/client-invoices" className="flex items-center gap-2 text-primary hover:underline">
                          <Receipt className="size-4" /> {t("quoteInvoiceLink", { number: invoice.number || t("draftInvoice") })}
                        </Link>
                      )}
                      {project && (
                        <Link href={`/dashboard/projects/${project.id}`} className="flex items-center gap-2 text-primary hover:underline">
                          <FolderKanban className="size-4" /> {project.code} · {project.name}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t px-6 py-4">
                  {canEdit && viewing.status === QuoteStatus.DRAFT && (
                    <>
                      <Button variant="outline" onClick={() => openForm(viewing)}><Pencil className="size-4" /> {t("edit")}</Button>
                      <Button variant="outline" onClick={() => setDeleting(viewing)}><Trash2 className="size-4" /> {t("delete")}</Button>
                      <Button disabled={busy} onClick={() => m.send.mutate(viewing.id)}><Send className="size-4" /> {t("quoteMarkSent")}</Button>
                    </>
                  )}
                  {canEdit && viewing.status === QuoteStatus.SENT && (
                    <>
                      <Button variant="outline" onClick={() => { setReason(""); setDeclining(viewing) }}><XCircle className="size-4" /> {t("quoteMarkDeclined")}</Button>
                      <Button disabled={busy} onClick={() => m.accept.mutate(viewing.id)}><CheckCircle className="size-4" /> {t("quoteMarkAccepted")}</Button>
                    </>
                  )}
                  {canEdit && viewing.status === QuoteStatus.ACCEPTED && (
                    <>
                      {!viewing.projectId && (
                        <Button variant="outline" onClick={() => { setProjectCode(""); setProjectManager(""); setProjectFor(viewing) }}>
                          <FolderKanban className="size-4" /> {t("quoteCreateProject")}
                        </Button>
                      )}
                      {!viewing.invoiceId && (
                        <Button disabled={busy} onClick={() => m.invoice.mutate(viewing.id)}><FileText className="size-4" /> {t("quoteCreateInvoice")}</Button>
                      )}
                    </>
                  )}
                  {canEdit && viewing.status !== QuoteStatus.DRAFT && (
                    <Button variant="ghost" disabled={busy} onClick={() => m.duplicate.mutate(viewing.id, { onSuccess: (q) => setViewingId(q.id) })}>
                      <Copy className="size-4" /> {t("quoteDuplicate")}
                    </Button>
                  )}
                </div>
              </>
            )
          })()}
        </SheetContent>
      </Sheet>

      <Dialog open={!!declining} onOpenChange={(o) => !o && setDeclining(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quoteMarkDeclined")}</DialogTitle>
            <DialogDescription>{t("quoteDeclineHint")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-label={t("reason")} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclining(null)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={!reason.trim() || m.decline.isPending} onClick={() => declining && m.decline.mutate({ id: declining.id, reason }, { onSuccess: () => setDeclining(null) })}>
              {t("quoteMarkDeclined")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!projectFor} onOpenChange={(o) => !o && setProjectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("quoteCreateProject")}</DialogTitle>
            <DialogDescription>{t("quoteProjectHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="qp-code">{t("projectCode")}</Label>
              <Input id="qp-code" value={projectCode} maxLength={12} placeholder="ABC-01" onChange={(e) => setProjectCode(e.target.value.toUpperCase())} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>{t("projectManager")}</Label>
              <Select value={projectManager} onValueChange={setProjectManager}>
                <SelectTrigger className="w-full bg-card" aria-label={t("projectManager")}><SelectValue placeholder="—">{employees.find((e) => e.id === projectManager)?.name}</SelectValue></SelectTrigger>
                <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectFor(null)}>{t("cancel")}</Button>
            <Button disabled={projectCode.trim().length < 2 || m.project.isPending} onClick={() => projectFor && m.project.mutate({ id: projectFor.id, code: projectCode, managerId: projectManager || undefined }, { onSuccess: () => setProjectFor(null) })}>
              {t("quoteCreateProject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("quoteDeleteTitle")}
        description={t("quoteDeleteConfirm")}
        destructive
        isLoading={m.remove.isPending}
        onConfirm={() => deleting && m.remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setViewingId(null) } })}
      />
    </div>
  )
}

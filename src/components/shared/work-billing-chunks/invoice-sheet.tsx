"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Ban, CheckCircle2, DownloadIcon, Plus, Send, Trash2 } from "@/components/ui/carbon/icons"
import { createId } from "@/lib/workforce/demo-store"
import { displayStatus, invoiceTotals } from "@/lib/workforce/billing"
import type { Client } from "@/types/workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { downloadClientInvoicePdf } from "@/lib/pdf/generate-client-invoice-pdf"
import { ClientInvoiceStatus, type ClientInvoice, type InvoiceLine } from "@/types/work-billing"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatShortDate } from "../work-projects-chunks/project-labels"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL } from "./billing-labels"

interface Props {
  invoice: ClientInvoice | null
  client?: Client
  canEdit: boolean
  busy: boolean
  onOpenChange: (open: boolean) => void
  onSaveDraft: (id: string, input: { taxRate?: number; lines?: InvoiceLine[] }) => void
  onSend: (id: string) => void
  onPaid: (id: string) => void
  onVoid: (id: string) => void
  onDelete: (id: string) => void
}

/** An invoice: client details, lines and totals, with the actions its status allows. */
export function InvoiceSheet({ invoice, client, canEdit, busy, onOpenChange, onSaveDraft, onSend, onPaid, onVoid, onDelete }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const [downloading, setDownloading] = useState(false)
  const [confirm, setConfirm] = useState<"void" | "delete" | null>(null)
  const [lineDesc, setLineDesc] = useState("")
  const [lineQty, setLineQty] = useState("1")
  const [linePrice, setLinePrice] = useState("")
  // The page remounts this sheet whenever the invoice changes, which resets these fields
  const [tax, setTax] = useState(invoice ? String(invoice.taxRate) : "")

  if (!invoice) return null

  const status = displayStatus(invoice)
  const isDraft = invoice.status === ClientInvoiceStatus.DRAFT
  const editable = isDraft && canEdit
  const totals = invoiceTotals(invoice)
  const money = (n: number) => formatMoney(n, invoice.currency, locale)

  const addLine = () => {
    const quantity = Number(lineQty)
    const unitPrice = Number(linePrice)
    if (!lineDesc.trim() || !(quantity > 0) || !(unitPrice >= 0)) return
    onSaveDraft(invoice.id, {
      lines: [...invoice.lines, { id: createId("ln"), description: lineDesc.trim(), quantity, unitPrice, timeEntryIds: [] }],
    })
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <SheetTitle className="font-mono">{invoice.number}</SheetTitle>
            <Badge variant="outline" className={INVOICE_STATUS_CLASS[status]}>
              {t(INVOICE_STATUS_LABEL[status])}
            </Badge>
          </div>
          <div className="flex items-center justify-between gap-3">
            <SheetDescription>{client?.name ?? "—"}</SheetDescription>
            <Button
              variant="outline"
              size="sm"
              disabled={downloading}
              onClick={async () => {
                setDownloading(true)
                try {
                  await downloadClientInvoicePdf(
                    invoice,
                    client,
                    workspace,
                    {
                      invoice: t("invoice"),
                      billTo: t("billTo"),
                      issueDate: t("issueDate"),
                      dueDate: t("dueDate"),
                      status: t("status"),
                      description: t("description"),
                      quantity: t("quantity"),
                      rate: t("rate"),
                      amount: t("amount"),
                      subtotal: t("subtotal"),
                      tax: t("tax"),
                      total: t("total"),
                      notes: t("notes"),
                      paymentTerms: t("paymentTermsDays"),
                    },
                    t(INVOICE_STATUS_LABEL[status]),
                    locale
                  )
                } finally {
                  setDownloading(false)
                }
              }}
            >
              <DownloadIcon className="size-4" />
              {t("downloadPdf")}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div><dt className="text-xs text-muted-foreground">{t("issueDate")}</dt><dd className="font-medium">{formatShortDate(invoice.issueDate, locale)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{t("dueDate")}</dt><dd className={status === "overdue" ? "font-medium text-destructive" : "font-medium"}>{formatShortDate(invoice.dueDate, locale)}</dd></div>
            {invoice.paidAt && <div><dt className="text-xs text-muted-foreground">{t("paidOn")}</dt><dd className="font-medium">{formatShortDate(invoice.paidAt.slice(0, 10), locale)}</dd></div>}
            <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-muted-foreground">{t("billTo")}</dt>
              <dd className="font-medium">{client?.name}{client?.taxId ? ` · ${client.taxId}` : ""}</dd>
              <dd className="text-muted-foreground">{[client?.address, client?.email].filter(Boolean).join(" · ")}</dd>
            </div>
          </dl>

          <div className="relative overflow-x-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">{t("description")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("quantity")}</th>
                  <th className="px-3 py-2 text-right font-medium">{t("rate")}</th>
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

          <dl className="ms-auto flex w-full max-w-xs flex-col gap-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-muted-foreground">
                {editable ? (
                  <Label className="flex items-center gap-2 font-normal">
                    {t("tax")}
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
                ) : (
                  t("taxAmount", { rate: invoice.taxRate })
                )}
              </dt>
              <dd className="tabular-nums">{money(totals.tax)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><dt>{t("total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
          </dl>

          {invoice.notes && <p className="whitespace-pre-line rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">{invoice.notes}</p>}
        </div>

        {canEdit && invoice.status !== ClientInvoiceStatus.PAID && invoice.status !== ClientInvoiceStatus.VOID && (
          <SheetFooter className="flex-row gap-3 border-t px-6 py-4">
            {isDraft ? (
              <>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirm("delete")}>
                  <Trash2 className="size-4" />
                  {t("deleteDraft")}
                </Button>
                <Button className="flex-1" disabled={busy || invoice.lines.length === 0} onClick={() => onSend(invoice.id)}>
                  <Send className="size-4" />
                  {t("markAsSent")}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirm("void")}>
                  <Ban className="size-4" />
                  {t("voidInvoice")}
                </Button>
                <Button className="flex-1" disabled={busy} onClick={() => onPaid(invoice.id)}>
                  <CheckCircle2 className="size-4" />
                  {t("markAsPaid")}
                </Button>
              </>
            )}
          </SheetFooter>
        )}

        <ConfirmAlertDialog
          open={!!confirm}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm === "void" ? t("voidInvoice") : t("deleteDraft")}
          description={confirm === "void" ? t("voidInvoiceConfirmation", { number: invoice.number }) : t("deleteDraftConfirmation", { number: invoice.number })}
          confirmLabel={confirm === "void" ? t("voidInvoice") : t("delete")}
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

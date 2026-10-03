"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { buildInvoiceLines, invoiceTotals, unbilledEntries } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import type { Client, Employee } from "@/types/workforce"
import type { WorkProject } from "@/types/work-projects"
import type { TimeEntry } from "@/types/work-billing"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatHours } from "./billing-labels"

interface Props {
  client: Client | null
  entries: TimeEntry[]
  projects: WorkProject[]
  employees: Employee[]
  currency: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: { clientId: string; entryIds: string[]; taxRate: number; issueDate: string; notes?: string }) => void
}

/**
 * Turns a client's approved, unbilled hours into a draft invoice: one block
 * per project and person, all selected by default.
 */
export function CreateInvoiceSheet({ client, entries, projects, employees, currency, isSubmitting, onOpenChange, onCreate }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const available = useMemo(
    () => (client ? unbilledEntries(entries, projects, client.id) : []),
    [client, entries, projects]
  )
  // Preview lines use stable ids so selection survives re-renders
  const blocks = useMemo(() => {
    let n = 0
    return buildInvoiceLines(available, projects, employees, client ?? undefined, () => `block_${n++}`)
  }, [available, projects, employees, client])

  // Everything starts selected; the page remounts this sheet for each client
  const [unselected, setUnselected] = useState<Set<string>>(new Set())
  const selected = new Set(blocks.map((b) => b.id).filter((id) => !unselected.has(id)))
  const [taxRate, setTaxRate] = useState("20")
  const [issueDate, setIssueDate] = useState(todayIso())
  const [notes, setNotes] = useState("")

  const chosen = blocks.filter((b) => selected.has(b.id))
  const tax = Number(taxRate)
  const taxValid = Number.isFinite(tax) && tax >= 0 && tax <= 100
  const totals = invoiceTotals({ lines: chosen, taxRate: taxValid ? tax : 0 })
  const money = (n: number) => formatMoney(n, currency, locale)

  return (
    <DataTableEntityFormSheet
      open={!!client}
      onOpenChange={onOpenChange}
      mode="create"
      createTitle={t("createInvoice")}
      editTitle={t("createInvoice")}
      description={client ? t("invoiceForClient", { client: client.name }) : undefined}
      submitLabel={{ create: t("createDraft") }}
      isSubmitting={isSubmitting}
      onSubmit={() => {
        if (!client || chosen.length === 0 || !taxValid) return
        onCreate({
          clientId: client.id,
          entryIds: chosen.flatMap((b) => b.timeEntryIds),
          taxRate: tax,
          issueDate,
          notes: notes.trim() || undefined,
        })
      }}
    >
      <div className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("hoursToBill")}</legend>
          {blocks.length === 0 && <p className="text-sm text-muted-foreground">{t("nothingToBill")}</p>}
          {blocks.map((block) => (
            <label key={block.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-muted/50">
              <Checkbox
                className="mt-0.5"
                checked={selected.has(block.id)}
                aria-label={block.description}
                onCheckedChange={(on) =>
                  setUnselected((s) => {
                    const next = new Set(s)
                    if (on) next.delete(block.id)
                    else next.add(block.id)
                    return next
                  })
                }
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{block.description}</span>
                <span className="block text-xs text-muted-foreground">
                  {formatHours(block.quantity)} × {money(block.unitPrice)}/h
                </span>
              </span>
              <span className="text-sm font-medium tabular-nums">{money(block.quantity * block.unitPrice)}</span>
            </label>
          ))}
        </fieldset>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice-date">{t("issueDate")}</Label>
            <Input id="invoice-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="invoice-tax">{t("taxPercent")}</Label>
            <Input id="invoice-tax" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} aria-invalid={!taxValid} />
            {!taxValid && <p className="text-sm text-destructive">{t("taxRange")}</p>}
          </div>
        </div>
        {client && (
          <p className="-mt-2 text-xs text-muted-foreground">{t("dueAfterDays", { days: client.paymentTermsDays })}</p>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="invoice-notes">{t("notesOnInvoice")}</Label>
          <Textarea id="invoice-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <dl className="flex flex-col gap-1.5 rounded-2xl border border-border bg-muted/40 p-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("subtotal")}</dt><dd className="tabular-nums">{money(totals.subtotal)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t("taxAmount", { rate: taxValid ? tax : 0 })}</dt><dd className="tabular-nums">{money(totals.tax)}</dd></div>
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><dt>{t("total")}</dt><dd className="tabular-nums">{money(totals.total)}</dd></div>
        </dl>
      </div>
    </DataTableEntityFormSheet>
  )
}

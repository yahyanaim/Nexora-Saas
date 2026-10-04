"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { buildInvoiceLines, invoiceTotals, unbilledEntries, type InvoiceGrouping } from "@/lib/workforce/billing"
import { openAdvances } from "@/lib/workforce/invoice-builders"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { todayIso } from "@/lib/workforce/project-metrics"
import type { Client, Employee } from "@/types/workforce"
import type { WorkProject, WorkTask } from "@/types/work-projects"
import type { ClientInvoice, TimeEntry } from "@/types/work-billing"
import type { Expense } from "@/types/work-costs"
import { unbilledExpenses } from "@/lib/workforce/profitability"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { formatHours } from "./billing-labels"

interface Props {
  client: Client | null
  entries: TimeEntry[]
  expenses: Expense[]
  projects: WorkProject[]
  employees: Employee[]
  tasks: WorkTask[]
  invoices: ClientInvoice[]
  currency: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: {
    clientId: string
    entryIds: string[]
    expenseIds: string[]
    taxRate: number
    issueDate: string
    notes?: string
    groupBy: InvoiceGrouping
    deductAdvances: boolean
  }) => void
}

const GROUPINGS: InvoiceGrouping[] = ["person", "task", "day"]

/**
 * Turns a client's approved, unbilled hours into a draft invoice: one block
 * per project and person, all selected by default.
 */
export function CreateInvoiceSheet({ client, entries, expenses, projects, employees, tasks, invoices, currency, isSubmitting, onOpenChange, onCreate }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const available = useMemo(
    () => (client ? unbilledEntries(entries, projects, client.id) : []),
    [client, entries, projects]
  )
  const [groupBy, setGroupBy] = useState<InvoiceGrouping>("person")
  // Preview lines use stable ids so selection survives re-renders
  const blocks = useMemo(() => {
    let n = 0
    return buildInvoiceLines(available, projects, employees, client ?? undefined, () => `${groupBy}_${n++}`, groupBy, tasks)
  }, [available, projects, employees, client, groupBy, tasks])
  const advances = useMemo(() => (client ? openAdvances(client.id, invoices) : []), [client, invoices])
  const [deductAdvances, setDeductAdvances] = useState(true)

  const rebillable = useMemo(
    () => (client ? unbilledExpenses(expenses, projects, client.id) : []),
    [client, expenses, projects]
  )

  // Everything starts selected; the page remounts this sheet for each client
  const [unselected, setUnselected] = useState<Set<string>>(new Set())
  const selected = new Set(blocks.map((b) => b.id).filter((id) => !unselected.has(id)))
  const [taxRate, setTaxRate] = useState("20")
  const [issueDate, setIssueDate] = useState(todayIso())
  const [notes, setNotes] = useState("")

  const chosenExpenses = rebillable.filter((x) => !unselected.has(x.id))
  const chosen = [
    ...blocks.filter((b) => selected.has(b.id)),
    ...chosenExpenses.map((x) => ({ id: x.id, description: x.description, quantity: 1, unitPrice: x.amount, timeEntryIds: [] })),
  ]
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
          expenseIds: chosenExpenses.map((x) => x.id),
          taxRate: tax,
          issueDate,
          notes: notes.trim() || undefined,
          groupBy,
          deductAdvances: deductAdvances && advances.length > 0,
        })
      }}
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <Label>{t("groupLinesBy")}</Label>
          <div className="w-44">
            <Select
              value={groupBy}
              onValueChange={(v) => {
                setGroupBy(v as InvoiceGrouping)
                // Blocks change with the grouping, so start from everything selected again
                setUnselected(new Set())
              }}
            >
              <SelectTrigger className="w-full bg-card" aria-label={t("groupLinesBy")}><SelectValue>{t(`groupBy_${groupBy}`)}</SelectValue></SelectTrigger>
              <SelectContent>{GROUPINGS.map((g) => <SelectItem key={g} value={g}>{t(`groupBy_${g}`)}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">{t("hoursToBill")}</legend>
          {blocks.length === 0 && <p className="text-sm text-muted-foreground">{t("noHoursToBill")}</p>}
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

        {rebillable.length > 0 && (
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("expensesToRebill")}</legend>
            {rebillable.map((x) => (
              <label key={x.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-3 hover:bg-muted/50">
                <Checkbox
                  className="mt-0.5"
                  checked={!unselected.has(x.id)}
                  aria-label={x.description}
                  onCheckedChange={(on) =>
                    setUnselected((s) => {
                      const next = new Set(s)
                      if (on) next.delete(x.id)
                      else next.add(x.id)
                      return next
                    })
                  }
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{x.description}</span>
                  <span className="block text-xs text-muted-foreground">{projects.find((p) => p.id === x.projectId)?.code} · {x.date}</span>
                </span>
                <span className="text-sm font-medium tabular-nums">{money(x.amount)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {advances.length > 0 && (
          <label className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm">
            <Checkbox checked={deductAdvances} onCheckedChange={setDeductAdvances} />
            <span className="flex-1">{t("deductAdvances", { count: advances.length })}</span>
            <span className="tabular-nums text-muted-foreground">−{money(advances.reduce((s, a) => s + invoiceTotals(a).subtotal, 0))}</span>
          </label>
        )}

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

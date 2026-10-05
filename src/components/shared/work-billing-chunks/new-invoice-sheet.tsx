"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { billedAgainstBudget, openAdvances } from "@/lib/workforce/invoice-builders"
import { invoiceTotals } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { clientOutstanding, creditStatus } from "@/lib/workforce/client-relations"
import type { NewInvoiceInput } from "@/lib/api/work-billing-api"
import type { Client } from "@/types/workforce"
import { BudgetType, type Milestone, type WorkProject } from "@/types/work-projects"
import { InvoiceKind, type ClientInvoice } from "@/types/work-billing"
import { formatMoney } from "../workforce-chunks/workforce-labels"

const KINDS = [InvoiceKind.FIXED, InvoiceKind.MILESTONE, InvoiceKind.RETAINER, InvoiceKind.ADVANCE, InvoiceKind.FREE] as const
type Kind = (typeof KINDS)[number]

interface Props {
  open: boolean
  clients: Client[]
  projects: WorkProject[]
  milestones: Milestone[]
  invoices: ClientInvoice[]
  currency: string
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (input: NewInvoiceInput) => void
}

/** Drafts the invoice types that aren't built from hours (BIL-3). */
export function NewInvoiceSheet({ open, clients, projects, milestones, invoices, currency, isSubmitting, onOpenChange, onCreate }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const money = (n: number) => formatMoney(n, currency, locale)
  const [kind, setKind] = useState<Kind>(InvoiceKind.FIXED)
  const [clientId, setClientId] = useState("")
  const [projectId, setProjectId] = useState("")
  const [milestoneId, setMilestoneId] = useState("")
  const [percent, setPercent] = useState("30")
  const [amount, setAmount] = useState("")
  const [month, setMonth] = useState(todayIso().slice(0, 7))
  const [label, setLabel] = useState("")
  const [taxRate, setTaxRate] = useState("20")
  const [issueDate, setIssueDate] = useState(todayIso())
  const [notes, setNotes] = useState("")
  const [deduct, setDeduct] = useState(true)

  const wantedType = kind === InvoiceKind.RETAINER ? BudgetType.RETAINER : kind === InvoiceKind.FIXED || kind === InvoiceKind.MILESTONE ? BudgetType.FIXED : undefined
  const clientProjects = projects.filter((p) => p.clientId === clientId && (!wantedType || p.budgetType === wantedType))
  const project = clientProjects.find((p) => p.id === projectId)
  const billed = project ? billedAgainstBudget(project, invoices) : undefined
  const advances = useMemo(() => (clientId ? openAdvances(clientId, invoices) : []), [clientId, invoices])
  const needsProject = kind !== InvoiceKind.ADVANCE && kind !== InvoiceKind.FREE
  const tax = Number(taxRate)

  const submit = () => {
    if (!clientId || (needsProject && !project) || !(tax >= 0 && tax <= 100)) return
    const base = { clientId, issueDate, taxRate: tax, notes: notes.trim() || undefined, deductAdvances: deduct && advances.length > 0 && kind !== InvoiceKind.ADVANCE }
    if (kind === InvoiceKind.FIXED) onCreate({ ...base, kind, projectId, percent: Number(percent) })
    else if (kind === InvoiceKind.MILESTONE) onCreate({ ...base, kind, projectId, milestoneId, amount: Number(amount) })
    else if (kind === InvoiceKind.RETAINER) onCreate({ ...base, kind, projectId, month })
    else if (kind === InvoiceKind.ADVANCE) onCreate({ ...base, kind, projectId: projectId || undefined, amount: Number(amount), label })
    else onCreate({ ...base, kind })
  }

  const field = (id: string, text: string, node: React.ReactNode, hint?: string) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{text}</Label>
      {node}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <DataTableEntityFormSheet
      open={open}
      onOpenChange={onOpenChange}
      mode="create"
      createTitle={t("newInvoice")}
      editTitle={t("newInvoice")}
      description={t("newInvoiceHint")}
      submitLabel={{ create: t("createDraft") }}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={t("invoiceType")}>
          {KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => { setKind(k); setProjectId("") }}
              className={kind === k ? "h-9 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-foreground" : "h-9 rounded-full border border-border bg-card px-4 text-[13px] font-medium text-muted-foreground hover:text-foreground"}
            >
              {t(`kind_${k}`)}
            </button>
          ))}
        </div>
        <p className="-mt-1 text-xs text-muted-foreground">{t(`kindHint_${kind}`)}</p>

        {field("nv-client", t("client"), (
          <Select value={clientId} onValueChange={(v) => { setClientId(v); setProjectId("") }}>
            <SelectTrigger id="nv-client" className="w-full bg-card"><SelectValue placeholder={t("chooseClient")}>{clients.find((c) => c.id === clientId)?.name}</SelectValue></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
        ))}
        {(() => {
          const c = clients.find((x) => x.id === clientId)
          const credit = c ? creditStatus(c, clientOutstanding(c.id, invoices)) : undefined
          return credit?.limit && credit.outstanding >= credit.limit * 0.8 ? (
            <p role="alert" className="-mt-1 rounded-xl bg-warning-soft px-3 py-2 text-xs text-warning-foreground">
              {t("creditLimitWarning", { owed: formatMoney(credit.outstanding, currency, locale), limit: formatMoney(credit.limit, currency, locale) })}
            </p>
          ) : null
        })()}

        {kind !== InvoiceKind.FREE && clientId && field("nv-project", kind === InvoiceKind.ADVANCE ? t("projectOptional") : t("project"), (
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="nv-project" className="w-full bg-card"><SelectValue placeholder={t("chooseProject")}>{project ? `${project.code} · ${project.name}` : undefined}</SelectValue></SelectTrigger>
            <SelectContent>
              {clientProjects.length === 0 && <div className="px-3 py-2 text-sm text-muted-foreground">{t("noMatchingProjects")}</div>}
              {clientProjects.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        ), billed && billed.budget > 0 ? t("billedOfPrice", { billed: money(billed.billed), price: money(billed.budget), percent: billed.percent ?? 0 }) : undefined)}

        {kind === InvoiceKind.FIXED && field("nv-percent", t("shareOfPrice"), (
          <Input id="nv-percent" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
        ), project?.budgetAmount ? `= ${money((project.budgetAmount * (Number(percent) || 0)) / 100)}` : undefined)}

        {kind === InvoiceKind.MILESTONE && project && field("nv-ms", t("milestone"), (
          <Select value={milestoneId} onValueChange={setMilestoneId}>
            <SelectTrigger id="nv-ms" className="w-full bg-card"><SelectValue placeholder={t("chooseMilestone")}>{milestones.find((m) => m.id === milestoneId)?.title}</SelectValue></SelectTrigger>
            <SelectContent>{milestones.filter((m) => m.projectId === project.id).map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}</SelectContent>
          </Select>
        ))}

        {(kind === InvoiceKind.MILESTONE || kind === InvoiceKind.ADVANCE) && field("nv-amount", `${t("amount")} (${currency})`, (
          <Input id="nv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        ))}

        {kind === InvoiceKind.ADVANCE && field("nv-label", t("description"), (
          <Input id="nv-label" value={label} placeholder={t("advanceLabelPlaceholder")} onChange={(e) => setLabel(e.target.value)} />
        ))}

        {kind === InvoiceKind.RETAINER && field("nv-month", t("month"), (
          <Input id="nv-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        ), project?.retainer ? t("retainerTerms", { amount: money(project.retainer.monthlyAmount), hours: project.retainer.includedHours, rate: money(project.retainer.overageRate) }) : undefined)}

        {kind === InvoiceKind.FREE && <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">{t("freeInvoiceHint")}</p>}

        <div className="grid grid-cols-2 gap-4">
          {field("nv-date", t("issueDate"), <Input id="nv-date" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />)}
          {field("nv-tax", t("taxPercent"), <Input id="nv-tax" inputMode="decimal" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />)}
        </div>

        {kind !== InvoiceKind.ADVANCE && advances.length > 0 && (
          <label className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm">
            <Checkbox checked={deduct} onCheckedChange={setDeduct} />
            <span className="flex-1">{t("deductAdvances", { count: advances.length })}</span>
            <span className="tabular-nums text-muted-foreground">−{money(advances.reduce((s, a) => s + invoiceTotals(a).subtotal, 0))}</span>
          </label>
        )}

        {field("nv-notes", t("notesOnInvoice"), <Textarea id="nv-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />)}
      </div>
    </DataTableEntityFormSheet>
  )
}

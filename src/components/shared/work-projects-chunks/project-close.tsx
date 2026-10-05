"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CheckCircle2, Lock, RotateCcw, XCircle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { projectProfit } from "@/lib/workforce/profitability"
import { closeChecklist } from "@/lib/workforce/scheduling"
import { useProjectMutations } from "@/hooks/workforce/use-work-projects"
import { BudgetType, type Milestone, type WorkProject, type WorkTask } from "@/types/work-projects"
import type { ClientInvoice, TimeEntry } from "@/types/work-billing"
import type { Expense } from "@/types/work-costs"
import type { Client, Employee } from "@/types/workforce"
import { formatMoney } from "../workforce-chunks/workforce-labels"

interface Data {
  project: WorkProject
  tasks: WorkTask[]
  milestones: Milestone[]
  entries: TimeEntry[]
  invoices: ClientInvoice[]
  expenses: Expense[]
  employees: Employee[]
  clients: Client[]
  currency: string
}

/** Checklist, final figures and confirmation before closing a project (PRJ-13). */
export function CloseProjectDialog({ open, onOpenChange, ...data }: Data & { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations()
  const locale = useLocale()
  const { close } = useProjectMutations()
  const [anyway, setAnyway] = useState(false)
  const { project } = data
  const checks = closeChecklist({ ...data, billable: project.budgetType !== BudgetType.NON_BILLABLE })
  const openItems = checks.filter((c) => c.open > 0).length
  const profit = projectProfit(project, data)
  const money = (n: number) => formatMoney(n, data.currency, locale)

  const confirm = () =>
    close.mutate(
      {
        id: project.id,
        snapshot: { revenue: profit.revenue, laborCost: profit.laborCost, expenses: profit.expenses, profit: profit.profit, margin: profit.margin, hours: profit.hours, currency: data.currency },
      },
      { onSuccess: () => onOpenChange(false) }
    )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("closeProjectTitle", { name: project.name })}</DialogTitle>
          <DialogDescription>{t("closeProjectHint")}</DialogDescription>
        </DialogHeader>
        <ul className="flex flex-col gap-2">
          {checks.map((c) => (
            <li key={c.key} className="flex items-center gap-2 text-sm">
              {c.open === 0 ? <CheckCircle2 className="size-4 text-success-foreground" /> : <XCircle className="size-4 text-warning-foreground" />}
              <span className="flex-1">{t(`closeCheck_${c.key}`)}</span>
              {c.open > 0 && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning-foreground">{t("closeOpenCount", { count: c.open })}</span>}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/50 p-3 text-sm">
          <span className="text-muted-foreground">{t("revenue")}</span>
          <span className="text-end font-medium tabular-nums">{money(profit.revenue)}</span>
          <span className="text-muted-foreground">{t("laborCost")}</span>
          <span className="text-end tabular-nums">{money(profit.laborCost)}</span>
          <span className="text-muted-foreground">{t("expenses")}</span>
          <span className="text-end tabular-nums">{money(profit.expenses)}</span>
          <span className="font-medium">{t("profit")}</span>
          <span className={cn("text-end font-semibold tabular-nums", profit.profit < 0 && "text-destructive")}>
            {money(profit.profit)}
            {profit.margin !== null ? ` · ${Math.round(profit.margin * 100)}%` : ""}
          </span>
        </div>
        {openItems > 0 && (
          <label className="flex items-start gap-2 rounded-2xl bg-warning-soft p-3 text-sm text-warning-foreground">
            <Checkbox checked={anyway} onCheckedChange={(v) => setAnyway(v)} className="mt-0.5" />
            {t("closeAnyway")}
          </label>
        )}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button disabled={close.isPending || (openItems > 0 && !anyway)} onClick={confirm}>
            <Lock className="size-4" /> {t("closeProject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Frozen figures of a closed project, with a way to reopen it. */
export function ClosedProjectSummary({ project, canEdit }: { project: WorkProject; canEdit: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const { reopen } = useProjectMutations()
  const s = project.closeSnapshot
  if (!project.closedAt || !s) return null
  const money = (n: number) => formatMoney(n, s.currency, locale)
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(project.closedAt))
  return (
    <section className="flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-muted/40 p-4 md:px-5">
      <Lock className="size-5 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{t("projectClosedOn", { date, name: s.closedBy })}</p>
        <p className="text-xs text-muted-foreground">
          {t("revenue")} {money(s.revenue)} · {t("laborCost")} {money(s.laborCost)} · {t("expenses")} {money(s.expenses)} · {t("profit")} {money(s.profit)}
          {s.margin !== null ? ` (${Math.round(s.margin * 100)}%)` : ""} · {s.hours} h
        </p>
      </div>
      {canEdit && (
        <Button variant="outline" size="sm" disabled={reopen.isPending} onClick={() => reopen.mutate(project.id)}>
          <RotateCcw className="size-4" /> {t("reopenProject")}
        </Button>
      )}
    </section>
  )
}

/** Saves the project's tasks and milestones as a reusable template (PRJ-2). */
export function SaveTemplateDialog({ project, open, onOpenChange }: { project: WorkProject; open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations()
  const { saveTemplate } = useProjectMutations()
  const [name, setName] = useState(project.name)
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("saveAsTemplate")}</DialogTitle>
          <DialogDescription>{t("saveAsTemplateHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="tpl-name">{t("templateName")}</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button disabled={!name.trim() || saveTemplate.isPending} onClick={() => saveTemplate.mutate({ id: project.id, name }, { onSuccess: () => onOpenChange(false) })}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

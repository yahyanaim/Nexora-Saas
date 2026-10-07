"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, FileSignature, Pencil, Plus, Send, Trash2, X } from "@/components/ui/carbon/icons"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { useChangeOrderMutations, useChangeOrders } from "@/hooks/workforce/use-change-orders"
import { changeTotals, phaseBudgets, unallocatedBudget, type PhaseAlert } from "@/lib/workforce/phase-budgets"
import { cn } from "@/lib/utils"
import type { Client, Employee } from "@/types/workforce"
import type { TimeEntry } from "@/types/work-billing"
import { BudgetType, ChangeOrderStatus, type ChangeOrder, type ChangeOrderInput, type Milestone, type WorkProject, type WorkTask } from "@/types/work-projects"

const PROJECT = "__project__"

const STATUS_CLASS: Record<ChangeOrderStatus, string> = {
  [ChangeOrderStatus.DRAFT]: "bg-muted text-muted-foreground border-transparent",
  [ChangeOrderStatus.SENT]: "bg-info-soft text-info-foreground border-transparent",
  [ChangeOrderStatus.APPROVED]: "bg-success-soft text-success-foreground border-transparent",
  [ChangeOrderStatus.REJECTED]: "bg-danger-soft text-destructive border-transparent",
}

const BAR: Record<PhaseAlert, string> = {
  none: "[&>div]:bg-primary",
  warning: "[&>div]:bg-warning",
  over: "[&>div]:bg-destructive",
}

interface Props {
  project: WorkProject
  milestones: Milestone[]
  tasks: WorkTask[]
  entries: TimeEntry[]
  employees: Employee[]
  clients: Client[]
  currency: string
  canEdit: boolean
  deciderName: string
  onSetPhaseBudget: (id: string, budget: { budgetHours?: number; budgetAmount?: number }, done: () => void) => void
}

/** Budget per phase and the change orders agreed with the client (Phase 6g.4). */
export function BudgetPanel({ project, milestones, tasks, entries, employees, clients, currency, canEdit, deciderName, onSetPhaseBudget }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const { data: orders = [] } = useChangeOrders(project.id)
  const { save, send, decide, remove } = useChangeOrderMutations()

  const [phase, setPhase] = useState<{ milestone: Milestone; hours: string; amount: string } | null>(null)
  const [editing, setEditing] = useState<{ id?: string; input: ChangeOrderInput } | null>(null)
  const [declining, setDeclining] = useState<{ order: ChangeOrder; reason: string } | null>(null)
  const [deleting, setDeleting] = useState<ChangeOrder | null>(null)

  const money = (n: number) => formatMoney(n, currency, locale)
  const signed = (n: number) => (n > 0 ? `+${money(n)}` : money(n))
  const signedHours = (n: number) => (n > 0 ? `+${n} h` : `${n} h`)
  const rows = phaseBudgets(project, { milestones, tasks, entries, employees, clients, changeOrders: orders })
  const totals = changeTotals(orders, project.id)
  const original = project.budgetAmount ?? 0
  const unallocated = unallocatedBudget(project, milestones)
  const phaseName = (id?: string) => milestones.find((m) => m.id === id)?.title ?? t("coWholeProject")
  const set = (patch: Partial<ChangeOrderInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))
  const measure = project.budgetType === BudgetType.HOURLY ? t("pbMeasureBillable") : t("pbMeasureCost")

  const summary = [
    { key: "orig", label: t("pbOriginal"), value: money(original) },
    { key: "changes", label: t("pbApprovedChanges"), value: signed(totals.amount), hint: t("pbHours", { hours: signedHours(totals.hours) }) },
    { key: "revised", label: t("pbRevised"), value: money(original + totals.amount), strong: true },
    { key: "pending", label: t("pbPending"), value: signed(totals.pendingAmount), hint: t("pbPendingHint", { count: totals.pendingCount }) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((s) => (
          <div key={s.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", s.strong && "text-primary")}>{s.value}</p>
            {s.hint && <p className="text-xs text-muted-foreground">{s.hint}</p>}
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("pbPhases")}</h3>
          <p className="text-xs text-muted-foreground">{t("pbPhasesHint", { measure })}</p>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={FileSignature} title={t("pbNoPhases")} hint={t("pbNoPhasesHint")} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[44rem] text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start font-medium">{t("pbPhase")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("pbHoursCol")}</th>
                  <th className="px-3 py-2 text-end font-medium">{t("pbAmountCol")}</th>
                  <th className="w-48 px-3 py-2 text-start font-medium">{t("pbUsed")}</th>
                  {canEdit && <th className="w-12 px-3 py-2" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.milestone?.id ?? "none"}>
                    <td className="px-3 py-2">
                      <p className={cn("font-medium", !r.milestone && "italic text-muted-foreground")}>{r.milestone?.title ?? t("pbNoPhase")}</p>
                      {(r.changeAmount !== 0 || r.changeHours !== 0) && <p className="text-xs text-muted-foreground">{t("pbIncludesChanges", { amount: signed(r.changeAmount), hours: signedHours(r.changeHours) })}</p>}
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums">{r.hours} / {r.budgetHours || "—"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">{money(r.amount)} / {r.budgetAmount ? money(r.budgetAmount) : "—"}</td>
                    <td className="px-3 py-2">
                      {r.percent === null ? (
                        <span className="text-xs text-muted-foreground">{t("pbNoBudget")}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress value={Math.min(100, r.percent)} aria-label={t("pbUsed")} className={cn("h-2 flex-1", BAR[r.alert])} />
                          <span className={cn("w-12 text-end text-xs font-medium tabular-nums", r.alert === "over" && "text-destructive", r.alert === "warning" && "text-warning-foreground")}>{r.percent}%</span>
                        </div>
                      )}
                    </td>
                    {canEdit && (
                      <td className="px-3 py-2 text-end">
                        {r.milestone && (
                          <Button size="icon-sm" variant="ghost" aria-label={t("pbSetBudget")} onClick={() => setPhase({ milestone: r.milestone!, hours: String(r.milestone!.budgetHours ?? ""), amount: String(r.milestone!.budgetAmount ?? "") })}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {original > 0 && unallocated !== 0 && (
          <p className={cn("text-xs", unallocated < 0 ? "text-destructive" : "text-muted-foreground")}>
            {unallocated > 0 ? t("pbUnallocated", { amount: money(unallocated) }) : t("pbOverAllocated", { amount: money(-unallocated) })}
          </p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">{t("coTitle")}</h3>
            <p className="text-xs text-muted-foreground">{t("coHint")}</p>
          </div>
          {canEdit && <Button size="sm" onClick={() => setEditing({ input: { projectId: project.id, title: "", amount: 0, hours: 0 } })}><Plus className="size-4" /> {t("coNew")}</Button>}
        </div>
        {orders.length === 0 ? (
          <EmptyState icon={FileSignature} title={t("coEmpty")} hint={t("coEmptyHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {orders.map((o) => {
              const open = o.status === ChangeOrderStatus.DRAFT || o.status === ChangeOrderStatus.SENT
              return (
                <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium"><span className="font-mono text-xs text-muted-foreground">{o.number}</span> · {o.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {phaseName(o.milestoneId)}
                      {o.description ? ` · ${o.description}` : ""}
                      {o.status === ChangeOrderStatus.REJECTED && o.rejectionReason ? ` · ${o.rejectionReason}` : ""}
                      {o.decidedBy ? ` · ${t("coDecidedBy", { name: o.decidedBy })}` : ""}
                    </p>
                  </div>
                  <span className={cn("text-sm font-semibold tabular-nums", o.amount < 0 && "text-destructive")}>{signed(o.amount)}</span>
                  <span className="w-16 text-end text-xs text-muted-foreground tabular-nums">{signedHours(o.hours)}</span>
                  <Badge variant="outline" className={STATUS_CLASS[o.status]}>{t(`coStatus_${o.status}`)}</Badge>
                  {canEdit && (
                    <div className="flex gap-1">
                      {o.status === ChangeOrderStatus.DRAFT && <Button size="sm" variant="outline" onClick={() => send.mutate(o.id)}><Send className="size-4" /> {t("coSend")}</Button>}
                      {o.status === ChangeOrderStatus.SENT && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => decide.mutate({ id: o.id, approved: true, by: deciderName })}><Check className="size-4" /> {t("coApprove")}</Button>
                          <Button size="sm" variant="outline" onClick={() => setDeclining({ order: o, reason: "" })}><X className="size-4" /> {t("coDecline")}</Button>
                        </>
                      )}
                      {open && <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => setEditing({ id: o.id, input: { projectId: o.projectId, milestoneId: o.milestoneId, title: o.title, description: o.description, amount: o.amount, hours: o.hours } })}><Pencil className="size-4" /></Button>}
                      {o.status === ChangeOrderStatus.DRAFT && <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(o)}><Trash2 className="size-4" /></Button>}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <DataTableEntityFormSheet
        open={!!phase}
        onOpenChange={(o) => !o && setPhase(null)}
        mode="edit"
        createTitle={t("pbSetBudget")}
        editTitle={t("pbSetBudgetFor", { phase: phase?.milestone.title ?? "" })}
        description={t("pbSetBudgetHint", { measure })}
        onSubmit={() =>
          phase &&
          onSetPhaseBudget(
            phase.milestone.id,
            { budgetHours: phase.hours === "" ? undefined : Math.max(0, Number(phase.hours)), budgetAmount: phase.amount === "" ? undefined : Math.max(0, Number(phase.amount)) },
            () => setPhase(null)
          )
        }
      >
        {phase && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-hours">{t("pbBudgetHours")}</Label>
              <Input id="pb-hours" type="number" min={0} value={phase.hours} onChange={(e) => setPhase({ ...phase, hours: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pb-amount">{t("pbBudgetAmount", { currency })}</Label>
              <Input id="pb-amount" type="number" min={0} value={phase.amount} onChange={(e) => setPhase({ ...phase, amount: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode={editing?.id ? "edit" : "create"}
        createTitle={t("coNew")}
        editTitle={t("coEdit")}
        description={t("coFormHint")}
        isSubmitting={save.isPending}
        onSubmit={() => editing && save.mutate({ id: editing.id, input: editing.input }, { onSuccess: () => setEditing(null) })}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="co-title">{t("coChange")}</Label>
              <Input id="co-title" placeholder={t("coTitlePlaceholder")} value={editing.input.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("pbPhase")}</Label>
              <Select value={editing.input.milestoneId || PROJECT} onValueChange={(v) => set({ milestoneId: v === PROJECT ? undefined : v })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("pbPhase")}><SelectValue>{phaseName(editing.input.milestoneId)}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROJECT}>{t("coWholeProject")}</SelectItem>
                  {milestones.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="co-amount">{t("coAmount", { currency })}</Label>
              <Input id="co-amount" type="number" value={editing.input.amount} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="co-hours">{t("coHours")}</Label>
              <Input id="co-hours" type="number" value={editing.input.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />
            </div>
            <p className="col-span-2 text-xs text-muted-foreground">{t("coNegativeHint")}</p>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="co-desc">{t("coDescription")}</Label>
              <Textarea id="co-desc" rows={3} value={editing.input.description ?? ""} onChange={(e) => set({ description: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      <DataTableEntityFormSheet
        open={!!declining}
        onOpenChange={(o) => !o && setDeclining(null)}
        mode="edit"
        createTitle={t("coDecline")}
        editTitle={t("coDeclineTitle", { number: declining?.order.number ?? "" })}
        description={t("coDeclineHint")}
        isSubmitting={decide.isPending}
        onSubmit={() => declining && decide.mutate({ id: declining.order.id, approved: false, by: deciderName, reason: declining.reason }, { onSuccess: () => setDeclining(null) })}
      >
        {declining && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="co-reason">{t("coDeclineReason")}</Label>
            <Textarea id="co-reason" rows={3} value={declining.reason} onChange={(e) => setDeclining({ ...declining, reason: e.target.value })} />
          </div>
        )}
      </DataTableEntityFormSheet>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("coDeleteTitle")}
        description={t("coDeleteConfirm")}
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

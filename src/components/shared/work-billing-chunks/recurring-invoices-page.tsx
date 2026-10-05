"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, FileText, Pencil, Play, Plus, Renew, Trash2 } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useProjects } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useRecurringInvoices, useRecurringMutations } from "@/hooks/workforce/use-crm"
import { dueSchedules, recurringAmount, scheduleFinished } from "@/lib/workforce/client-relations"
import { invoiceTotals } from "@/lib/workforce/billing"
import { createId } from "@/lib/workforce/demo-store"
import { todayIso } from "@/lib/workforce/project-metrics"
import { toast } from "@/lib/utils/toast"
import { cn } from "@/lib/utils"
import { ClientInvoiceStatus } from "@/types/work-billing"
import { RecurringFrequency, type RecurringInput, type RecurringInvoice } from "@/types/work-crm"
import { formatMoney } from "../workforce-chunks/workforce-labels"

const NONE = "__none__"
const PER_MONTH: Record<RecurringFrequency, number> = { monthly: 1, quarterly: 1 / 3, yearly: 1 / 12 }

const emptyInput = (): RecurringInput => ({
  clientId: "",
  title: "",
  frequency: RecurringFrequency.MONTHLY,
  startDate: todayIso(),
  taxRate: 20,
  active: true,
  lines: [{ id: createId("rl"), description: "", quantity: 1, unit: "month", unitPrice: 0 }],
})

type ScheduleState = "active" | "paused" | "ended"
const STATE_CLASS: Record<ScheduleState, string> = {
  active: "bg-success-soft text-success-foreground border-transparent",
  paused: "bg-muted text-muted-foreground border-transparent",
  ended: "bg-muted/60 text-muted-foreground border-transparent",
}

/** Schedules that draft the same invoice every period, for review before issue (BIL-14). */
export default function RecurringInvoicesPage() {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const { data: schedules = [], isLoading } = useRecurringInvoices()
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: invoices = [] } = useClientInvoices()
  const { save, setActive, remove, run, runDue } = useRecurringMutations()
  const [editing, setEditing] = useState<{ id?: string; input: RecurringInput } | null>(null)
  const today = todayIso()

  const clientOf = (id: string) => clients.find((c) => c.id === id)
  const currencyOf = (s: Pick<RecurringInvoice, "clientId">) => clientOf(s.clientId)?.currency ?? workspace.currency
  const money = (n: number, currency = workspace.currency) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const stateOf = (s: RecurringInvoice): ScheduleState => (scheduleFinished(s) ? "ended" : s.active ? "active" : "paused")

  const due = dueSchedules(schedules, today)
  const running = schedules.filter((s) => stateOf(s) === "active")
  const monthly = running.reduce((sum, s) => sum + recurringAmount(s).net * PER_MONTH[s.frequency], 0)
  const drafts = invoices.filter((i) => i.recurringId && i.status === ClientInvoiceStatus.DRAFT)

  const cards: MetricCardItem[] = [
    { key: "active", title: t("recurringActive"), value: running.length, valueClassName: "text-primary", footer: { icon: Renew, text: t("recurringActiveHint") } },
    { key: "mrr", title: t("recurringMonthly"), value: money(monthly), footer: { icon: Calendar, text: t("recurringMonthlyHint") } },
    { key: "due", title: t("recurringDue"), value: due.length, valueClassName: due.length ? "text-warning-foreground" : undefined, footer: { icon: Play, text: t("recurringDueHint") } },
    { key: "drafts", title: t("recurringDrafts"), value: drafts.length, footer: { icon: FileText, text: t("recurringDraftsHint") } },
  ]

  const open = (s?: RecurringInvoice) =>
    setEditing(
      s
        ? { id: s.id, input: { clientId: s.clientId, projectId: s.projectId, title: s.title, frequency: s.frequency, startDate: s.startDate, endDate: s.endDate, lines: s.lines, taxRate: s.taxRate, notes: s.notes, active: s.active } }
        : { input: emptyInput() }
    )
  const set = (patch: Partial<RecurringInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))
  const setLine = (i: number, patch: Partial<RecurringInput["lines"][number]>) =>
    setEditing((e) => (e ? { ...e, input: { ...e.input, lines: e.input.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) } } : e))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        actions={
          <>
            <Button
              variant="outline"
              disabled={due.length === 0 || runDue.isPending}
              onClick={() => runDue.mutate(undefined, { onSuccess: (n) => toast.success(t("recurringDraftedCount", { count: n })) })}
            >
              <Play className="size-4" /> {t("recurringRunDue", { count: due.length })}
            </Button>
            <Button onClick={() => open()}>
              <Plus className="size-4" /> {t("recurringNew")}
            </Button>
          </>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("recurringSchedules")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("recurringSchedulesHint")}</p>
        {isLoading ? (
          <ListSkeleton />
        ) : schedules.length === 0 ? (
          <EmptyState icon={Renew} title={t("recurringEmpty")} hint={t("recurringEmptyHint")} />
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {schedules.map((s) => {
              const state = stateOf(s)
              const isDue = due.includes(s)
              return (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {clientOf(s.clientId)?.name ?? "—"} · {t(`freq_${s.frequency}`)} · {t("recurringNext", { date: date(s.nextRunDate) })}
                      {s.endDate ? ` · ${t("recurringUntil", { date: date(s.endDate) })}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium tabular-nums">{money(recurringAmount(s).total, currencyOf(s))}</span>
                  <Badge variant="outline" className={cn("w-20 justify-center", isDue ? "bg-warning-soft text-warning-foreground border-transparent" : STATE_CLASS[state])}>
                    {isDue ? t("recurringStateDue") : t(`recurringState_${state}`)}
                  </Badge>
                  <div className="flex gap-1">
                    <Button size="sm" variant={isDue ? "primary" : "outline"} disabled={state !== "active" || run.isPending} onClick={() => run.mutate(s.id)}>
                      <Play className="size-4" /> {t("recurringDraftNow")}
                    </Button>
                    {state !== "ended" && (
                      <Button size="sm" variant="ghost" disabled={setActive.isPending} onClick={() => setActive.mutate({ id: s.id, active: !s.active })}>
                        {s.active ? t("pause") : t("resume")}
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="size-8" aria-label={t("edit")} onClick={() => open(s)}>
                      <Pencil className="size-4" />
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-1 text-base font-semibold">{t("recurringReview")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("recurringReviewHint")}</p>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("recurringNoDrafts")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {drafts.map((inv) => (
              <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                <span className="min-w-0 flex-1 truncate">{inv.subject ?? t("draft")}</span>
                <span className="text-muted-foreground">{clientOf(inv.clientId)?.name}</span>
                <span className="font-medium tabular-nums">{money(invoiceTotals(inv).total, inv.currency)}</span>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/dashboard/client-invoices">{t("recurringOpenInvoices")}</Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing?.id ? t("recurringEdit") : t("recurringNew")}</DialogTitle>
            <DialogDescription>{t("recurringDialogHint")}</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid max-h-[60vh] gap-3 overflow-y-auto pe-1">
              <div className="grid gap-1.5">
                <Label htmlFor="rc-title">{t("name")}</Label>
                <Input id="rc-title" value={editing.input.title} onChange={(e) => set({ title: e.target.value })} placeholder={t("recurringTitlePlaceholder")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("client")}</Label>
                  <Select value={editing.input.clientId} onValueChange={(v) => set({ clientId: v, projectId: undefined })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue placeholder={t("chooseClient")}>{clientOf(editing.input.clientId)?.name}</SelectValue></SelectTrigger>
                    <SelectContent>{clients.filter((c) => c.status !== "archived").map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>{t("projectOptional")}</Label>
                  <Select value={editing.input.projectId ?? NONE} onValueChange={(v) => set({ projectId: v === NONE ? undefined : v })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue>{projects.find((p) => p.id === editing.input.projectId)?.name ?? t("none")}</SelectValue></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("none")}</SelectItem>
                      {projects.filter((p) => p.clientId === editing.input.clientId).map((p) => <SelectItem key={p.id} value={p.id}>{p.code} · {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="grid gap-1.5">
                  <Label>{t("frequency")}</Label>
                  <Select value={editing.input.frequency} onValueChange={(v) => set({ frequency: v as RecurringFrequency })}>
                    <SelectTrigger className="w-full bg-card"><SelectValue>{t(`freq_${editing.input.frequency}`)}</SelectValue></SelectTrigger>
                    <SelectContent>{Object.values(RecurringFrequency).map((f) => <SelectItem key={f} value={f}>{t(`freq_${f}`)}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rc-start">{t("firstInvoice")}</Label>
                  <Input id="rc-start" type="date" value={editing.input.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rc-end">{t("endDate")}</Label>
                  <Input id="rc-end" type="date" min={editing.input.startDate} value={editing.input.endDate ?? ""} onChange={(e) => set({ endDate: e.target.value || undefined })} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="rc-tax">{t("taxPercent")}</Label>
                  <Input id="rc-tax" type="number" min={0} max={100} value={editing.input.taxRate} onChange={(e) => set({ taxRate: Number(e.target.value) })} />
                </div>
              </div>
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-sm font-medium">{t("lines")}</legend>
                {editing.input.lines.map((l, i) => (
                  <div key={l.id} className="grid grid-cols-[1fr_70px_80px_100px_32px] items-center gap-2">
                    <Input aria-label={t("description")} placeholder={t("description")} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                    <Input aria-label={t("quantity")} type="number" min={0} step="0.25" value={l.quantity} onChange={(e) => setLine(i, { quantity: Number(e.target.value) })} />
                    <Input aria-label={t("unit")} placeholder={t("unit")} value={l.unit ?? ""} onChange={(e) => setLine(i, { unit: e.target.value || undefined })} />
                    <Input aria-label={t("unitPrice")} type="number" min={0} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon" className="size-8" aria-label={t("remove")} disabled={editing.input.lines.length === 1} onClick={() => set({ lines: editing.input.lines.filter((_, j) => j !== i) })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => set({ lines: [...editing.input.lines, { id: createId("rl"), description: "", quantity: 1, unitPrice: 0 }] })}>
                  <Plus className="size-4" /> {t("addLine")}
                </Button>
                <p className="text-end text-sm">
                  {t("totalPerPeriod")}: <span className="font-semibold tabular-nums">{money(recurringAmount(editing.input).total, currencyOf(editing.input))}</span>
                </p>
              </fieldset>
              <div className="grid gap-1.5">
                <Label htmlFor="rc-notes">{t("notes")}</Label>
                <Textarea id="rc-notes" rows={2} value={editing.input.notes ?? ""} onChange={(e) => set({ notes: e.target.value || undefined })} />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {editing?.id && (
              <Button variant="ghost" className="me-auto text-destructive" onClick={() => remove.mutate(editing.id!, { onSuccess: () => setEditing(null) })}>
                <Trash2 className="size-4" /> {t("delete")}
              </Button>
            )}
            <Button variant="outline" onClick={() => setEditing(null)}>{t("cancel")}</Button>
            <Button disabled={save.isPending} onClick={() => editing && save.mutate({ input: editing.input, id: editing.id }, { onSuccess: () => setEditing(null) })}>
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

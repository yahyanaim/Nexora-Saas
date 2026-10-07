"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Funnel, Pencil, Plus, Trash2, TrendingUp, Trophy, Warning, Wallet } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useDealMutations, useDeals } from "@/hooks/workforce/use-deals"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { STAGE_PROBABILITY, dealProbability, pipelineByStage, pipelineSummary, weightedValue } from "@/lib/workforce/deals"
import { cn } from "@/lib/utils"
import { ClientStatus, EmployeeStatus } from "@/types/workforce"
import { DealStage, OPEN_STAGES, type Deal, type DealInput } from "@/types/work-sales"

const STAGE_DOT: Record<DealStage, string> = {
  [DealStage.LEAD]: "bg-muted-foreground/40",
  [DealStage.QUALIFIED]: "bg-info-foreground",
  [DealStage.PROPOSAL]: "bg-primary",
  [DealStage.NEGOTIATION]: "bg-warning",
  [DealStage.WON]: "bg-success",
  [DealStage.LOST]: "bg-destructive",
}

const emptyDeal = (): DealInput => ({ title: "", clientId: "", amount: 0, stage: DealStage.LEAD, expectedClose: addDays(todayIso(), 30) })

/** Deals followed from first contact to signature, with the weighted pipeline (Phase 6g.2). */
export default function DealsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { currency } = useCurrentWorkspace()
  const { data: deals = [], isLoading } = useDeals()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: quotes = [] } = useQuotes()
  const { save, move, remove } = useDealMutations()

  const [editing, setEditing] = useState<{ id?: string; input: DealInput } | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)

  const today = todayIso()
  const summary = useMemo(() => pipelineSummary(deals, today), [deals, today])
  const byStage = useMemo(() => pipelineByStage(deals), [deals])
  const money = (n: number) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—"
  const personName = (id?: string) => employees.find((e) => e.id === id)?.name
  const quoteNumber = (id?: string) => quotes.find((q) => q.id === id)?.number
  const set = (patch: Partial<DealInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e))

  const cards: MetricCardItem[] = [
    { key: "open", title: t("dealOpenPipeline"), value: money(summary.openAmount), valueClassName: "text-primary", footer: { icon: Funnel, text: t("dealOpenHint", { count: summary.openCount }) } },
    { key: "weighted", title: t("dealWeighted"), value: money(summary.weighted), footer: { icon: TrendingUp, text: t("dealWeightedHint") } },
    { key: "won", title: t("dealWon"), value: money(summary.wonAmount), valueClassName: "text-success", footer: { icon: Trophy, text: summary.winRate === null ? t("dealNoClosed") : t("dealWinRate", { rate: summary.winRate }) } },
    { key: "overdue", title: t("dealOverdue"), value: summary.overdue.length, valueClassName: summary.overdue.length ? "text-destructive" : undefined, footer: { icon: Warning, text: t("dealOverdueHint") } },
  ]

  const edit = (d: Deal) =>
    setEditing({ id: d.id, input: { title: d.title, clientId: d.clientId, amount: d.amount, stage: d.stage, probability: d.probability, expectedClose: d.expectedClose, ownerId: d.ownerId, quoteId: d.quoteId, lostReason: d.lostReason, note: d.note } })

  // A lost deal needs a reason, so that move goes through the form
  const moveTo = (d: Deal, stage: DealStage) => {
    if (stage === d.stage) return
    if (stage === DealStage.LOST) {
      edit({ ...d, stage })
      return
    }
    move.mutate({ id: d.id, stage })
  }

  const renderCard = (d: Deal) => {
    const overdue = OPEN_STAGES.includes(d.stage as (typeof OPEN_STAGES)[number]) && d.expectedClose < today
    return (
      <li
        key={d.id}
        draggable
        onDragStart={() => setDragId(d.id)}
        onDragEnd={() => setDragId(null)}
        className={cn("flex cursor-grab flex-col gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm", dragId === d.id && "opacity-50")}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{d.title}</p>
            <p className="truncate text-xs text-muted-foreground">{clientName(d.clientId)}</p>
          </div>
          <div className="flex shrink-0">
            <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => edit(d)}><Pencil className="size-3.5" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(d)}><Trash2 className="size-3.5" /></Button>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums">{money(d.amount)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{t("dealChance", { pct: dealProbability(d) })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("text-muted-foreground", overdue && "font-medium text-destructive")}>{t("dealCloses", { date: date(d.expectedClose) })}</span>
          {quoteNumber(d.quoteId) && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{quoteNumber(d.quoteId)}</Badge>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{personName(d.ownerId) ?? ""}</span>
          <Select value={d.stage} onValueChange={(v) => moveTo(d, v as DealStage)}>
            <SelectTrigger className="h-7 w-36 bg-card text-xs" aria-label={t("dealMoveTo")}><SelectValue>{t(`dealStage_${d.stage}`)}</SelectValue></SelectTrigger>
            <SelectContent>{Object.values(DealStage).map((s) => <SelectItem key={s} value={s}>{t(`dealStage_${s}`)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </li>
    )
  }

  const renderColumn = (stage: DealStage) => {
    const s = byStage.find((r) => r.stage === stage)!
    const rows = deals.filter((d) => d.stage === stage).sort((a, b) => a.expectedClose.localeCompare(b.expectedClose))
    return (
      <div
        key={stage}
        className="flex min-w-[15rem] flex-1 flex-col gap-3 rounded-3xl bg-muted/40 p-3"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => {
          const d = deals.find((x) => x.id === dragId)
          if (d) moveTo(d, stage)
          setDragId(null)
        }}
      >
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="flex items-center gap-2 text-sm font-semibold"><span className={cn("size-2 rounded-full", STAGE_DOT[stage])} />{t(`dealStage_${stage}`)}<span className="text-xs font-normal text-muted-foreground">{s.count}</span></span>
          <span className="text-xs text-muted-foreground tabular-nums" title={t("dealWeighted")}>{money(s.amount)}</span>
        </div>
        <ul className="flex flex-col gap-2">{rows.map(renderCard)}</ul>
      </div>
    )
  }

  const closed = deals.filter((d) => d.stage === DealStage.WON || d.stage === DealStage.LOST).sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
  const clientQuotes = editing ? quotes.filter((q) => q.clientId === editing.input.clientId && q.number) : []
  const pickClients = clients.filter((c) => c.status !== ClientStatus.ARCHIVED || c.id === editing?.input.clientId)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader actions={<Button onClick={() => setEditing({ input: emptyDeal() })}><Plus className="size-4" /> {t("dealNew")}</Button>} />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="text-base font-semibold">{t("dealBoard")}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t("dealBoardHint")}</p>
        {isLoading ? (
          <ListSkeleton />
        ) : deals.length === 0 ? (
          <EmptyState icon={Funnel} title={t("dealEmpty")} hint={t("dealEmptyHint")} />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">{OPEN_STAGES.map(renderColumn)}</div>
        )}
      </section>

      {closed.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("dealClosed")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("dealClosedHint")}</p>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {closed.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("size-2 rounded-full", STAGE_DOT[d.stage])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title} · {clientName(d.clientId)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t(`dealStage_${d.stage}`)}{d.closedAt ? ` · ${date(d.closedAt)}` : ""}{d.lostReason ? ` · ${d.lostReason}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{money(d.amount)}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => move.mutate({ id: d.id, stage: DealStage.NEGOTIATION })}>{t("dealReopen")}</Button>
                  <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => edit(d)}><Pencil className="size-4" /></Button>
                  <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(d)}><Trash2 className="size-4" /></Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <DataTableEntityFormSheet
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        mode={editing?.id ? "edit" : "create"}
        createTitle={t("dealNew")}
        editTitle={t("dealEdit")}
        description={t("dealFormHint")}
        isSubmitting={save.isPending}
        onSubmit={() => editing && save.mutate({ id: editing.id, input: editing.input }, { onSuccess: () => setEditing(null) })}
      >
        {editing && (
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="deal-title">{t("dealTitle")}</Label>
              <Input id="deal-title" placeholder={t("dealTitlePlaceholder")} value={editing.input.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>{t("client")}</Label>
              <Select value={editing.input.clientId || undefined} onValueChange={(v) => set({ clientId: v, quoteId: undefined })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("client")}><SelectValue placeholder={t("dealChooseClient")}>{editing.input.clientId ? clientName(editing.input.clientId) : undefined}</SelectValue></SelectTrigger>
                <SelectContent>{pickClients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-amount">{t("dealAmount", { currency })}</Label>
              <Input id="deal-amount" type="number" min={0} value={editing.input.amount} onChange={(e) => set({ amount: Number(e.target.value) })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-close">{t("dealExpectedClose")}</Label>
              <Input id="deal-close" type="date" value={editing.input.expectedClose} onChange={(e) => set({ expectedClose: e.target.value })} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dealStage")}</Label>
              <Select value={editing.input.stage} onValueChange={(v) => set({ stage: v as DealStage, probability: undefined })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("dealStage")}><SelectValue>{t(`dealStage_${editing.input.stage}`)}</SelectValue></SelectTrigger>
                <SelectContent>{Object.values(DealStage).map((s) => <SelectItem key={s} value={s}>{t(`dealStage_${s}`)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-prob">{t("dealProbability")}</Label>
              <Input
                id="deal-prob"
                type="number"
                min={0}
                max={100}
                disabled={!OPEN_STAGES.includes(editing.input.stage as (typeof OPEN_STAGES)[number])}
                placeholder={String(STAGE_PROBABILITY[editing.input.stage])}
                value={editing.input.probability ?? ""}
                onChange={(e) => set({ probability: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
            </div>
            {editing.input.stage === DealStage.LOST && (
              <div className="col-span-2 flex flex-col gap-1.5">
                <Label htmlFor="deal-lost">{t("dealLostReason")}</Label>
                <Input id="deal-lost" placeholder={t("dealLostPlaceholder")} value={editing.input.lostReason ?? ""} onChange={(e) => set({ lostReason: e.target.value })} />
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <Label>{t("dealOwner")}</Label>
              <Select value={editing.input.ownerId || undefined} onValueChange={(v) => set({ ownerId: v })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("dealOwner")}><SelectValue placeholder={t("dealChooseOwner")}>{personName(editing.input.ownerId)}</SelectValue></SelectTrigger>
                <SelectContent>{employees.filter((e) => e.status !== EmployeeStatus.INACTIVE).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t("dealQuote")}</Label>
              <Select value={editing.input.quoteId || "none"} onValueChange={(v) => set({ quoteId: v === "none" ? undefined : v })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("dealQuote")} disabled={!editing.input.clientId}><SelectValue>{quoteNumber(editing.input.quoteId) ?? t("dealNoQuote")}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("dealNoQuote")}</SelectItem>
                  {clientQuotes.map((q) => <SelectItem key={q.id} value={q.id}>{q.number} · {q.subject}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="col-span-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wallet className="size-3.5" />
              {t("dealWeightedLine", { value: money(weightedValue(editing.input)) })}
            </p>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="deal-note">{t("notes")}</Label>
              <Textarea id="deal-note" rows={2} value={editing.input.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t("dealDeleteTitle")}
        description={t("dealDeleteConfirm")}
        destructive
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

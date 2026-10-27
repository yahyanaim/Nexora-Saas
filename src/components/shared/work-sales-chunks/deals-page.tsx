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
import { Clock, FolderKanban, Funnel, ListChecks, SettingsAdjust, Upload, Pencil, Plus, Trash2, TrendingUp, Trophy, Warning, Wallet } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { FollowUpDialog, type FollowUpDefaults } from "../workforce-chunks/follow-up-dialog"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { sortFollowUps } from "@/lib/workforce/follow-ups"
import { useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useDealMutations, useDeals } from "@/hooks/workforce/use-deals"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { daysInStage, dealProbability, isOpenDeal, isStale, pipelineByStage, pipelineSummary, stageOf, weightedValue } from "@/lib/workforce/deals"
import { usePipeline } from "@/hooks/workforce/use-pipeline"
import { PipelineStagesDialog } from "./pipeline-stages-dialog"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { ClientStatus, EmployeeStatus } from "@/types/workforce"
import { DealStage, type Deal, type DealInput, type DealStageId } from "@/types/work-sales"

const STAGE_DOT: Record<string, string> = {
  [DealStage.LEAD]: "bg-muted-foreground/40",
  [DealStage.QUALIFIED]: "bg-info-foreground",
  [DealStage.PROPOSAL]: "bg-primary",
  [DealStage.NEGOTIATION]: "bg-warning",
  [DealStage.WON]: "bg-success",
  [DealStage.LOST]: "bg-destructive",
}

// added stages have no colour of their own
const dotOf = (stage: DealStageId) => STAGE_DOT[stage] ?? "bg-primary/60"

const emptyDeal = (stage: DealStageId): DealInput => ({ title: "", clientId: "", amount: 0, stage, expectedClose: addDays(todayIso(), 30) })

/** Deals followed from first contact to signature, with the weighted pipeline (Phase 6g.2). */
export default function DealsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { currency } = useCurrentWorkspace()
  const { data: deals = [], isLoading } = useDeals()
  const { data: clients = [] } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: quotes = [] } = useQuotes()
  const { save, move, remove, savePipeline, createProject } = useDealMutations()
  const { pipeline, stageLabel } = usePipeline()
  const user = useAuthGuard().authedUser
  // the pipeline is part of the workspace settings; projects need their own right
  const canEditStages = can(user, AdminPermissionsPlatform.ROLES_READ)
  const canCreateProject = can(user, AdminPermissionsPlatform.PROJECTS_CREATE)
  const [stagesOpen, setStagesOpen] = useState(false)
  const [staleOnly, setStaleOnly] = useState(false)
  const [starting, setStarting] = useState<{ deal: Deal; code: string; managerId?: string } | null>(null)

  const [editing, setEditing] = useState<{ id?: string; input: DealInput } | null>(null)
  const [deleting, setDeleting] = useState<Deal | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const canImport = can(user, AdminPermissionsPlatform.CLIENTS_IMPORT)
  const [planning, setPlanning] = useState<FollowUpDefaults | null>(null)
  const { data: followUps = [] } = useFollowUps()
  // the next open follow-up of each deal (CRM step 5)
  const nextStep = useMemo(() => {
    const map = new Map<string, (typeof followUps)[number]>()
    for (const f of sortFollowUps(followUps)) if (f.dealId && !f.doneAt && !map.has(f.dealId)) map.set(f.dealId, f)
    return map
  }, [followUps])

  const today = todayIso()
  const summary = useMemo(() => pipelineSummary(deals, today, pipeline), [deals, today, pipeline])
  const byStage = useMemo(() => pipelineByStage(deals, pipeline, today), [deals, pipeline, today])
  const openStages = pipeline.stages.map((st) => st.id)
  const allStages = [...openStages, DealStage.WON, DealStage.LOST]
  const money = (n: number) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso}T00:00:00`))
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? "—"
  const contactOf = (clientId: string, contactId?: string) => (contactId ? clients.find((c) => c.id === clientId)?.contacts.find((x) => x.id === contactId) : undefined)
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
    setEditing({ id: d.id, input: { title: d.title, clientId: d.clientId, amount: d.amount, stage: d.stage, probability: d.probability, expectedClose: d.expectedClose, ownerId: d.ownerId, contactId: d.contactId, quoteId: d.quoteId, lostReason: d.lostReason, note: d.note } })

  // A lost deal needs a reason, so that move goes through the form
  const moveTo = (d: Deal, stage: DealStageId) => {
    if (stage === d.stage) return
    if (stage === DealStage.LOST) {
      edit({ ...d, stage })
      return
    }
    move.mutate({ id: d.id, stage })
  }

  const renderCard = (d: Deal) => {
    const open = isOpenDeal(d)
    const overdue = open && d.expectedClose < today
    const stale = isStale(d, today, pipeline)
    const days = daysInStage(d, today)
    const next = nextStep.get(d.id)
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
            <p className="truncate text-xs text-muted-foreground">{[clientName(d.clientId), contactOf(d.clientId, d.contactId)?.name].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="flex shrink-0">
            {open && <Button size="icon-sm" variant="ghost" aria-label={t("fuPlanForDeal", { deal: d.title })} title={t("fuPlan")} onClick={() => setPlanning({ clientId: d.clientId, dealId: d.id })}><ListChecks className="size-3.5" /></Button>}
            <Button size="icon-sm" variant="ghost" aria-label={t("edit")} onClick={() => edit(d)}><Pencil className="size-3.5" /></Button>
            <Button size="icon-sm" variant="ghost" aria-label={t("delete")} onClick={() => setDeleting(d)}><Trash2 className="size-3.5" /></Button>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-sm font-semibold tabular-nums">{money(d.amount)}</span>
          <span className="text-xs text-muted-foreground tabular-nums">{t("dealChance", { pct: dealProbability(d, pipeline) })}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className={cn("text-muted-foreground", overdue && "font-medium text-destructive")}>{t("dealCloses", { date: date(d.expectedClose) })}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-px tabular-nums", stale ? "bg-warning-soft font-medium text-warning-foreground" : "text-muted-foreground")} title={t("dealSinceTitle", { date: date(d.stageSince ?? d.createdAt.slice(0, 10)) })}>
            <Clock className="size-3" />
            {stale ? t("dealStale", { days }) : t("dealInStage", { days })}
          </span>
          {quoteNumber(d.quoteId) && <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{quoteNumber(d.quoteId)}</Badge>}
        </div>
        {open && (
          <p className={cn("flex items-center gap-1.5 truncate text-xs", next ? (next.dueDate < today ? "text-destructive" : "text-muted-foreground") : "text-warning-foreground")}>
            <ListChecks className="size-3.5 shrink-0" />
            <span className="truncate">{next ? t("fuNextStep", { title: next.title, date: date(next.dueDate) }) : t("fuNoNextStep")}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{personName(d.ownerId) ?? ""}</span>
          <Select value={d.stage} onValueChange={(v) => moveTo(d, v)}>
            <SelectTrigger className="h-7 w-36 bg-card text-xs" aria-label={t("dealMoveTo")}><SelectValue>{stageLabel(d.stage)}</SelectValue></SelectTrigger>
            <SelectContent>{allStages.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </li>
    )
  }

  const renderColumn = (stage: DealStageId) => {
    const s = byStage.find((r) => r.stage === stage)!
    const rows = deals.filter((d) => d.stage === stage && (!staleOnly || isStale(d, today, pipeline))).sort((a, b) => a.expectedClose.localeCompare(b.expectedClose))
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
        <div className="flex flex-col gap-1 px-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold"><span className={cn("size-2 shrink-0 rounded-full", dotOf(stage))} /><span className="truncate">{stageLabel(stage)}</span><span className="text-xs font-normal text-muted-foreground">{s.count}</span></span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{t("dealChance", { pct: stageOf(stage, pipeline)?.probability ?? 0 })}</span>
          </div>
          {/* the column's value and what it is worth at its chance of winning (CRM step 8) */}
          <div className="flex items-baseline justify-between gap-2 text-xs tabular-nums">
            <span className="text-muted-foreground">{money(s.amount)}</span>
            <span className="font-medium text-foreground" title={t("dealWeightedHint")}>{t("dealColumnWeighted", { value: money(s.weighted) })}</span>
          </div>
          {s.stale > 0 && <span className="w-fit rounded-full bg-warning-soft px-2 py-px text-[11px] font-medium text-warning-foreground">{t("dealColumnStale", { count: s.stale })}</span>}
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
      <PageHeader
        actions={
          <>
            {canImport && <Button variant="outline" asChild><Link href="/dashboard/clients/import?kind=deals"><Upload className="size-4" />{t("imImport")}</Link></Button>}
            {canEditStages && <Button variant="outline" onClick={() => setStagesOpen(true)}><SettingsAdjust className="size-4" />{t("dealStages")}</Button>}
            <Button onClick={() => setEditing({ input: emptyDeal(openStages[0]!) })}><Plus className="size-4" /> {t("dealNew")}</Button>
          </>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">{t("dealBoard")}</h2>
            <p className="text-sm text-muted-foreground">{t("dealBoardHint")}</p>
          </div>
          {/* deals that have not moved for longer than the company's limit */}
          <Button variant="outline" size="sm" aria-pressed={staleOnly} disabled={summary.stale.length === 0 && !staleOnly} onClick={() => setStaleOnly((v) => !v)} className={cn(staleOnly && "border-warning bg-warning-soft text-warning-foreground hover:bg-warning-soft")}>
            <Clock className="size-4" />
            {staleOnly ? t("dealShowAll") : t("dealStaleFilter", { count: summary.stale.length, days: pipeline.staleDays })}
          </Button>
        </div>
        {isLoading ? (
          <ListSkeleton />
        ) : deals.length === 0 ? (
          <EmptyState icon={Funnel} title={t("dealEmpty")} hint={t("dealEmptyHint")} />
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1">{openStages.map(renderColumn)}</div>
        )}
      </section>

      {closed.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="text-base font-semibold">{t("dealClosed")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("dealClosedHint")}</p>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {closed.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("size-2 rounded-full", dotOf(d.stage))} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.title} · {clientName(d.clientId)}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {stageLabel(d.stage)}{d.closedAt ? ` · ${date(d.closedAt)}` : ""}{d.lostReason ? ` · ${d.lostReason}` : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{money(d.amount)}</span>
                <div className="flex flex-wrap gap-1">
                  {d.stage === DealStage.WON && d.projectId && (
                    <Button size="sm" variant="outline" asChild><Link href={`/dashboard/projects/${d.projectId}`}><FolderKanban className="size-4" />{t("dealOpenProject")}</Link></Button>
                  )}
                  {d.stage === DealStage.WON && !d.projectId && canCreateProject && (
                    <Button size="sm" onClick={() => setStarting({ deal: d, code: "", managerId: d.ownerId })}><FolderKanban className="size-4" />{t("dealStartProject")}</Button>
                  )}
                  {/* a reopened deal goes back to the last open stage */}
                  <Button size="sm" variant="outline" onClick={() => move.mutate({ id: d.id, stage: openStages[openStages.length - 1]! })}>{t("dealReopen")}</Button>
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
              <Select value={editing.input.clientId || undefined} onValueChange={(v) => set({ clientId: v, quoteId: undefined, contactId: clients.find((c) => c.id === v)?.contacts.find((x) => x.isPrimary)?.id })}>
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
              <Select value={editing.input.stage} onValueChange={(v) => set({ stage: v, probability: undefined })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("dealStage")}><SelectValue>{stageLabel(editing.input.stage)}</SelectValue></SelectTrigger>
                <SelectContent>{allStages.map((s) => <SelectItem key={s} value={s}>{stageLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="deal-prob">{t("dealProbability")}</Label>
              <Input
                id="deal-prob"
                type="number"
                min={0}
                max={100}
                disabled={!isOpenDeal(editing.input)}
                placeholder={String(dealProbability({ stage: editing.input.stage }, pipeline))}
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
              <Label>{t("dealContact")}</Label>
              <Select value={editing.input.contactId || "none"} onValueChange={(v) => set({ contactId: v === "none" ? undefined : v })}>
                <SelectTrigger className="w-full bg-card" aria-label={t("dealContact")} disabled={!editing.input.clientId}><SelectValue>{contactOf(editing.input.clientId, editing.input.contactId)?.name ?? "—"}</SelectValue></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {(clients.find((c) => c.id === editing.input.clientId)?.contacts ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
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
              {t("dealWeightedLine", { value: money(weightedValue(editing.input, pipeline)) })}
            </p>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="deal-note">{t("notes")}</Label>
              <Textarea id="deal-note" rows={2} value={editing.input.note ?? ""} onChange={(e) => set({ note: e.target.value })} />
            </div>
          </div>
        )}
      </DataTableEntityFormSheet>

      {stagesOpen && (
        <PipelineStagesDialog
          open
          onOpenChange={setStagesOpen}
          pipeline={pipeline}
          countOf={(stage) => deals.filter((d) => d.stage === stage).length}
          saving={savePipeline.isPending}
          onSave={(next, moves) => savePipeline.mutate({ pipeline: next, moves }, { onSuccess: () => setStagesOpen(false) })}
        />
      )}

      <Dialog open={!!starting} onOpenChange={(o) => !o && setStarting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("dealStartProjectTitle")}</DialogTitle>
            <DialogDescription>{starting ? t("dealStartProjectHint", { deal: starting.deal.title, client: clientName(starting.deal.clientId), amount: money(starting.deal.amount) }) : ""}</DialogDescription>
          </DialogHeader>
          {starting && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="deal-project-code">{t("projectCode")}</Label>
                <Input id="deal-project-code" autoFocus value={starting.code} maxLength={12} placeholder="ORB-02" onChange={(e) => setStarting({ ...starting, code: e.target.value.toUpperCase() })} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t("projectManager")}</Label>
                <Select value={starting.managerId || undefined} onValueChange={(v) => setStarting({ ...starting, managerId: v })}>
                  <SelectTrigger className="w-full bg-card" aria-label={t("projectManager")}><SelectValue placeholder={t("dealChooseOwner")}>{personName(starting.managerId)}</SelectValue></SelectTrigger>
                  <SelectContent>{employees.filter((e) => e.status !== EmployeeStatus.INACTIVE).map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setStarting(null)}>{t("cancel")}</Button>
            <Button disabled={!starting || starting.code.trim().length < 2 || createProject.isPending} onClick={() => starting && createProject.mutate({ id: starting.deal.id, code: starting.code, managerId: starting.managerId }, { onSuccess: () => setStarting(null) })}>
              <FolderKanban className="size-4" />
              {t("dealStartProject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FollowUpDialog open={!!planning} onOpenChange={(o) => !o && setPlanning(null)} defaults={planning ?? undefined} lockClient />

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

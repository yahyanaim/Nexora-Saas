"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { EmptyState } from "@/components/ui/empty-state"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BadgeCheck, CreditCard, DownloadIcon, FileSignature, FileText, Flag, FolderKanban, Receipt, XCircle } from "@/components/ui/carbon/icons"
import { cn } from "@/lib/utils"
import { SatisfactionSurveys } from "./satisfaction"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClients } from "@/hooks/workforce/use-workforce"
import { useMilestones, useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { usePortalMutations } from "@/hooks/workforce/use-portal"
import { displayStatus, invoiceBalance, invoiceTotals, toBase } from "@/lib/workforce/billing"
import { milestoneState, taskProgress, todayIso } from "@/lib/workforce/project-metrics"
import { awaitingClient } from "@/lib/workforce/portal"
import { quoteDisplayStatus, quoteTotals } from "@/lib/workforce/quotes"
import { downloadClientInvoicePdf } from "@/lib/pdf/generate-client-invoice-pdf"
import { downloadQuotePdf } from "@/lib/pdf/generate-quote-pdf"
import { ClientInvoiceStatus } from "@/types/work-billing"
import { QuoteStatus } from "@/types/work-quotes"
import { WorkProjectStatus, type Milestone } from "@/types/work-projects"
import { formatMoney } from "../workforce-chunks/workforce-labels"
import { MILESTONE_STATE_CLASS, MILESTONE_STATE_LABEL, formatShortDate } from "../work-projects-chunks/project-labels"
import { INVOICE_STATUS_CLASS, INVOICE_STATUS_LABEL } from "../work-billing-chunks/billing-labels"
import { QUOTE_STATUS_CLASS, QUOTE_STATUS_LABEL } from "../work-billing-chunks/quotes-page"

interface Props {
  clientId: string
  /** Name recorded with decisions, e.g. the signed-in contact */
  viewerName: string
  /** Staff preview: shows everything but decisions are disabled */
  preview?: boolean
}

/** What a client sees: its projects and milestones, invoices and quotes (CRM-9, CRM-10). */
export function PortalView({ clientId, viewerName, preview }: Props) {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const today = todayIso()
  const { data: clients = [] } = useClients()
  const { data: allProjects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: milestones = [] } = useMilestones()
  const { data: allInvoices = [] } = useClientInvoices()
  const { data: quotes = [] } = useQuotes()
  const { data: settings } = useWorkspaceSettings()
  const { decide } = usePortalMutations()
  const [deciding, setDeciding] = useState<{ milestone: Milestone; approved: boolean } | null>(null)
  const [comment, setComment] = useState("")

  const client = clients.find((c) => c.id === clientId)
  const currency = client?.currency ?? workspace.currency
  const money = (n: number, cur = currency) => formatMoney(n, cur, locale)
  // Only this client's records ever reach the screen
  const projects = allProjects
    .filter((p) => p.clientId === clientId && p.status !== WorkProjectStatus.CANCELLED)
    .sort((a, b) => Number(a.status === WorkProjectStatus.COMPLETED) - Number(b.status === WorkProjectStatus.COMPLETED) || (b.dueDate ?? "").localeCompare(a.dueDate ?? ""))
  const invoices = allInvoices.filter((i) => i.clientId === clientId && i.status !== ClientInvoiceStatus.DRAFT).sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const clientQuotes = quotes.filter((q) => q.clientId === clientId && q.status !== QuoteStatus.DRAFT).sort((a, b) => b.issueDate.localeCompare(a.issueDate))
  const msOf = (projectId: string) => milestones.filter((m) => m.projectId === projectId).sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const tasksOf = (projectId: string) => tasks.filter((x) => x.projectId === projectId)
  const waiting = projects.flatMap((p) => msOf(p.id).filter((m) => awaitingClient(m, tasksOf(p.id), today)))
  const open = invoices.reduce((s, i) => s + toBase(invoiceBalance(i, allInvoices), i), 0)
  const overdue = invoices.filter((i) => displayStatus(i, today, allInvoices) === "overdue").length
  const nextMs = projects.flatMap((p) => msOf(p.id)).filter((m) => m.dueDate >= today && !m.approvedAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
  const active = projects.filter((p) => p.status !== WorkProjectStatus.COMPLETED)

  const cards: MetricCardItem[] = [
    { key: "projects", title: t("portalActiveProjects"), value: active.length, valueClassName: "text-primary", footer: { icon: FolderKanban, text: t("portalProjectsHint", { count: projects.length }) } },
    { key: "waiting", title: t("portalWaiting"), value: waiting.length, valueClassName: waiting.length ? "text-warning-foreground" : undefined, footer: { icon: BadgeCheck, text: t("portalWaitingHint") } },
    { key: "open", title: t("portalOpenBalance"), value: money(open, workspace.currency), valueClassName: overdue ? "text-destructive" : undefined, footer: { icon: Receipt, text: overdue ? t("portalOverdueCount", { count: overdue }) : t("portalNothingOverdue") } },
    { key: "next", title: t("portalNextMilestone"), value: nextMs ? formatShortDate(nextMs.dueDate, locale) : "—", footer: { icon: Flag, text: nextMs?.title ?? t("portalNoMilestone") } },
  ]

  const bank = settings?.company
  const submit = () => {
    if (!deciding) return
    decide.mutate(
      { clientId, milestoneId: deciding.milestone.id, approved: deciding.approved, comment, by: viewerName },
      { onSuccess: () => { setDeciding(null); setComment("") } }
    )
  }

  if (!client) return <EmptyState icon={FolderKanban} title={t("portalNoClient")} />

  return (
    <div className="space-y-6">
      <MetricCardGrid cards={cards} />
      <SatisfactionSurveys clientId={clientId} viewerName={viewerName} projects={projects} milestones={milestones} preview={preview} />

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Projects and milestones */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5 xl:col-span-2">
          <h2 className="mb-1 text-base font-semibold">{t("portalYourProjects")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("portalProjectsSub")}</p>
          {projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title={t("noProjectsYet")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {projects.map((p) => {
                const own = tasksOf(p.id)
                const progress = p.status === WorkProjectStatus.COMPLETED && own.length === 0 ? 100 : taskProgress(own)
                return (
                  <li key={p.id} className="rounded-2xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.code} · {formatShortDate(p.startDate, locale)} → {formatShortDate(p.dueDate, locale)}
                        </p>
                      </div>
                      <Badge variant="outline" className={p.status === WorkProjectStatus.COMPLETED ? "bg-success-soft text-success-foreground border-transparent" : "bg-info-soft text-info-foreground border-transparent"}>
                        {t(p.status === WorkProjectStatus.COMPLETED ? "portalDelivered" : p.status === WorkProjectStatus.PLANNING ? "portalStarting" : "portalInProgress")}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={progress} aria-label={t("progress")} className="h-2 flex-1" />
                      <span className="w-10 text-end text-sm font-medium tabular-nums">{progress}%</span>
                    </div>
                    {msOf(p.id).length > 0 && (
                      <ul className="mt-3 flex flex-col divide-y divide-border rounded-xl border border-border">
                        {msOf(p.id).map((m) => {
                          const state = milestoneState(m, own, today)
                          const canDecide = awaitingClient(m, own, today)
                          return (
                            <li key={m.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5 text-sm">
                              <Flag className="size-4 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium">{m.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {t("dueOn", { date: formatShortDate(m.dueDate, locale) })}
                                  {m.approvedAt ? ` · ${t("portalApprovedOn", { date: formatShortDate(m.approvedAt.slice(0, 10), locale) })}` : ""}
                                </p>
                                {m.rejectedAt && !m.approvedAt && m.decisionComment && (
                                  <p className="mt-1 rounded-lg bg-warning-soft px-2 py-1 text-xs text-warning-foreground">
                                    {t("portalChangesAsked", { by: m.decidedBy ?? "—" })}: {m.decisionComment}
                                  </p>
                                )}
                              </div>
                              <Badge variant="outline" className={MILESTONE_STATE_CLASS[state]}>{t(MILESTONE_STATE_LABEL[state])}</Badge>
                              {canDecide && (
                                <div className="flex gap-1">
                                  <Button size="sm" disabled={preview} onClick={() => setDeciding({ milestone: m, approved: true })}>
                                    <BadgeCheck className="size-4" /> {t("portalApprove")}
                                  </Button>
                                  <Button size="sm" variant="outline" disabled={preview} onClick={() => setDeciding({ milestone: m, approved: false })}>
                                    <XCircle className="size-4" /> {t("portalRequestChanges")}
                                  </Button>
                                </div>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* How to pay */}
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-1 flex items-center gap-2 text-base font-semibold"><CreditCard className="size-4" /> {t("portalHowToPay")}</h2>
          <p className="mb-4 text-sm text-muted-foreground">{t("portalHowToPayHint")}</p>
          <dl className="grid gap-2 text-sm">
            {[
              [t("portalPayee"), bank?.legalName ?? workspace.name],
              [t("bankName"), bank?.bankName],
              [t("bankAccount"), bank?.bankAccount],
              ["SWIFT", bank?.bankSwift],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-end font-medium">{v}</dd>
                </div>
              ))}
          </dl>
          <p className="mt-4 rounded-2xl bg-info-soft p-3 text-xs text-info-foreground">{t("portalPayReference")}</p>
        </section>
      </div>

      {/* Invoices */}
      <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
        <h2 className="mb-3 text-base font-semibold">{t("invoices")}</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("portalNoInvoices")}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {invoices.map((inv) => {
              const s = displayStatus(inv, today, allInvoices)
              const balance = invoiceBalance(inv, allInvoices)
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="w-32 font-mono text-xs">{inv.number}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {formatShortDate(inv.issueDate, locale)} · {t("portalDue", { date: formatShortDate(inv.dueDate, locale) })}
                  </span>
                  <span className="text-end tabular-nums">
                    <span className="block font-medium">{money(invoiceTotals(inv).total, inv.currency)}</span>
                    {balance > 0 && balance < invoiceTotals(inv).total && <span className="block text-xs text-muted-foreground">{t("portalLeftToPay", { amount: money(balance, inv.currency) })}</span>}
                  </span>
                  <Badge variant="outline" className={cn("w-24 justify-center", INVOICE_STATUS_CLASS[s])}>{t(INVOICE_STATUS_LABEL[s])}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("downloadPdf")}
                    onClick={() => downloadClientInvoicePdf({ invoice: inv, allInvoices, client, workspace, company: settings?.company, projects: allProjects, balance, locale })}
                  >
                    <DownloadIcon className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Quotes */}
      {clientQuotes.length > 0 && (
        <section className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <h2 className="mb-3 text-base font-semibold">{t("quotes")}</h2>
          <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
            {clientQuotes.map((q) => {
              const s = quoteDisplayStatus(q, today)
              return (
                <li key={q.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <FileSignature className="size-4 text-muted-foreground" />
                  <span className="w-32 font-mono text-xs">{q.number}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{q.subject}</span>
                  <span className="font-medium tabular-nums">{money(quoteTotals(q).net, q.currency)}</span>
                  <Badge variant="outline" className={cn("w-24 justify-center", QUOTE_STATUS_CLASS[s])}>{t(QUOTE_STATUS_LABEL[s])}</Badge>
                  <Button variant="ghost" size="sm" aria-label={t("downloadPdf")} onClick={() => downloadQuotePdf({ quote: q, client, workspace, company: settings?.company, locale })}>
                    <DownloadIcon className="size-4" />
                  </Button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <Dialog open={!!deciding} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deciding?.approved ? t("portalApproveTitle") : t("portalChangesTitle")}</DialogTitle>
            <DialogDescription>{deciding?.milestone.title}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="portal-comment">{deciding?.approved ? t("portalCommentOptional") : t("portalCommentRequired")}</Label>
            <Textarea id="portal-comment" rows={4} value={comment} onChange={(e) => setComment(e.target.value)} />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeciding(null)}>{t("cancel")}</Button>
            <Button disabled={decide.isPending || (!deciding?.approved && !comment.trim())} onClick={submit}>
              {deciding?.approved ? t("portalApprove") : t("portalSendChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

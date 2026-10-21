"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { CheckCircle, Funnel, Plus, Sparkles, TrendingUp, Wallet, XCircle } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClientMutations, useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useDeals } from "@/hooks/workforce/use-deals"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { can } from "@/lib/permissions/can"
import { addDays } from "@/lib/workforce/billing"
import { isOpenDeal } from "@/lib/workforce/deals"
import { isLostLead, leadStats } from "@/lib/workforce/leads"
import { todayIso } from "@/lib/workforce/project-metrics"
import { cn } from "@/lib/utils"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import { ClientStatus, LeadSource, type Client, type ClientInput } from "@/types/workforce"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { ClientForm, type ClientFormHandle } from "./client-form"
import { clientPageHref } from "./client-page-tabs"
import { relativeDay } from "./clients-columns"
import { formatMoney } from "./workforce-labels"
import { ConvertDialog, DropDialog } from "./lead-dialogs"

/**
 * Leads (CRM step 6): where they come from, which ones are moving, and the
 * two ways out: convert to a client with its first deal, or drop with a reason.
 */
export default function LeadsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const canEdit = can(authedUser, P.CLIENTS_UPDATE)
  const canCreate = can(authedUser, P.CLIENTS_CREATE)
  const canSeeMoney = can(authedUser, P.INVOICES_READ)
  const workspace = useCurrentWorkspace()
  const { data: clients = [], isLoading } = useClients()
  const { data: employees = [] } = useEmployees()
  const { data: deals = [] } = useDeals()
  const { data: followUps = [] } = useFollowUps()
  const { create } = useClientMutations()
  const today = todayIso()

  const [source, setSource] = React.useState<LeadSource | "all">("all")
  const [query, setQuery] = React.useState("")
  const [converting, setConverting] = React.useState<Client | null>(null)
  const [dropping, setDropping] = React.useState<Client | null>(null)
  const [adding, setAdding] = React.useState(false)
  const formRef = React.useRef<ClientFormHandle>(null)

  const stats = React.useMemo(() => leadStats(clients, today), [clients, today])
  const leads = clients.filter((c) => c.status === ClientStatus.LEAD).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const q = query.trim().toLowerCase()
  const shown = leads.filter((c) => (source === "all" || c.leadSource === source) && (!q || [c.name, c.industry ?? "", ...c.contacts.flatMap((x) => [x.name, x.email])].some((f) => f.toLowerCase().includes(q))))
  const since90 = addDays(today, -90)
  const decided = clients
    .filter((c) => (c.convertedAt && c.convertedAt >= since90) || (isLostLead(c) && c.updatedAt.slice(0, 10) >= since90))
    .sort((a, b) => (b.convertedAt ?? b.updatedAt).localeCompare(a.convertedAt ?? a.updatedAt))
  const openDealsOf = (id: string) => deals.filter((d) => d.clientId === id && isOpenDeal(d))
  const pipeline = leads.reduce((s, c) => s + openDealsOf(c.id).reduce((x, d) => x + d.amount, 0), 0)
  const money = (n: number) => formatMoney(n, workspace.currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const nameOf = (id?: string) => employees.find((e) => e.id === id)?.name

  const cards: MetricCardItem[] = [
    { key: "open", title: t("ldOpen"), value: stats.open, valueClassName: "text-primary", footer: { icon: Funnel, text: t("ldOpenHint") } },
    { key: "new", title: t("ldNew"), value: stats.newRecently, footer: { icon: Sparkles, text: t("ldNewHint") } },
    {
      key: "rate",
      title: t("ldConversion"),
      value: stats.conversionRate === null ? "—" : `${stats.conversionRate}%`,
      valueClassName: stats.conversionRate !== null && stats.conversionRate >= 50 ? "text-success-foreground" : undefined,
      footer: { icon: TrendingUp, text: t("ldConversionHint", { converted: stats.converted, lost: stats.lost }) },
    },
    canSeeMoney
      ? { key: "pipeline", title: t("ldPipeline"), value: money(pipeline), footer: { icon: Wallet, text: t("ldPipelineHint") } }
      : { key: "pipeline", title: t("ldWithDeal"), value: leads.filter((c) => openDealsOf(c.id).length).length, footer: { icon: Wallet, text: t("ldPipelineHint") } },
  ]
  const maxSource = Math.max(1, ...stats.bySource.map((s) => s.count))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader actions={canCreate && <Button variant="primary" onClick={() => setAdding(true)}><Plus className="size-4" />{t("ldAdd")}</Button>} />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-labelledby="ld-open" className="space-y-4 rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 id="ld-open" className="text-base font-semibold">{t("ldOpenLeads")}</h2>
            <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("ldSearch")} aria-label={t("ldSearch")} className="md:w-64" />
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("clLeadSource")}>
            {(["all", ...Object.values(LeadSource)] as const).map((s) => {
              const n = s === "all" ? leads.length : leads.filter((c) => c.leadSource === s).length
              if (s !== "all" && !n) return null
              return (
                <button key={s} type="button" aria-pressed={source === s} onClick={() => setSource(s)} className={cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium", source === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted")}>
                  {s === "all" ? t("all") : t(`clSource_${s}`)}
                  <span className="tabular-nums opacity-70">{n}</span>
                </button>
              )
            })}
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : shown.length === 0 ? (
            <EmptyState icon={Funnel} title={leads.length ? t("ldNoMatch") : t("ldNone")} hint={t("ldNoneHint")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border">
              {shown.map((c) => {
                const contact = c.contacts.find((x) => x.isPrimary)
                const open = openDealsOf(c.id)
                const next = followUps.filter((f) => f.clientId === c.id && !f.doneAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0]
                return (
                  <li key={c.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <SpaceAvatar name={c.name} size="md" />
                      <div className="min-w-0 space-y-1">
                        <p className="flex flex-wrap items-center gap-1.5">
                          <Link href={clientPageHref(c.id)} className="font-medium hover:text-primary hover:underline">{c.name}</Link>
                          {c.leadSource && <Badge variant="outline" className="border-transparent bg-info-soft text-info-foreground">{t(`clSource_${c.leadSource}`)}</Badge>}
                        </p>
                        <p className="flex flex-wrap gap-y-0.5 text-xs text-muted-foreground [&>*+*]:before:mx-1.5 [&>*+*]:before:content-['·']">
                          {contact && <span>{contact.name}{contact.position ? ` (${contact.position})` : ""}</span>}
                          {c.industry && <span>{c.industry}</span>}
                          <span>{t("ldAdded", { when: relativeDay(c.createdAt.slice(0, 10), today, locale) })}</span>
                          {nameOf(c.accountManagerId) && <span>{nameOf(c.accountManagerId)}</span>}
                        </p>
                        <p className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                          {open.length > 0 ? (
                            <span className="text-foreground">{t("ldDeal", { title: open[0]!.title })}{canSeeMoney ? ` · ${money(open[0]!.amount)}` : ""}{open.length > 1 ? ` +${open.length - 1}` : ""}</span>
                          ) : (
                            <span className="text-muted-foreground">{t("ldNoDeal")}</span>
                          )}
                          {next ? <span className={next.dueDate < today ? "text-destructive" : "text-muted-foreground"}>{t("fuNextStep", { title: next.title, date: date(next.dueDate) })}</span> : <span className="text-warning-foreground">{t("fuNoNextStep")}</span>}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex shrink-0 gap-2 lg:justify-end">
                        <Button size="sm" variant="outline" onClick={() => setDropping(c)} aria-label={t("ldDropOf", { name: c.name })}><XCircle className="size-4" />{t("ldDrop")}</Button>
                        <Button size="sm" variant="primary" onClick={() => setConverting(c)} aria-label={t("ldConvertOf", { name: c.name })}><CheckCircle className="size-4" />{t("ldConvert")}</Button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="space-y-6">
          <section aria-labelledby="ld-sources" className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 id="ld-sources" className="mb-1 text-base font-semibold">{t("ldSources")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t("ldSourcesHint")}</p>
            {stats.bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("ldNone")}</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.bySource.map((s) => (
                  <li key={s.source} className="grid grid-cols-[7rem_minmax(0,1fr)_2rem] items-center gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{s.source === "unknown" ? t("ldUnknownSource") : t(`clSource_${s.source}`)}</span>
                    <span className="h-2 rounded-full bg-muted" aria-hidden>
                      <span className="block h-2 rounded-full bg-primary" style={{ width: `${(s.count / maxSource) * 100}%` }} />
                    </span>
                    <span className="text-end font-medium tabular-nums">{s.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="ld-decided" className="rounded-3xl border border-border bg-card p-4 shadow-panel md:p-5">
            <h2 id="ld-decided" className="mb-1 text-base font-semibold">{t("ldDecided")}</h2>
            <p className="mb-3 text-xs text-muted-foreground">{t("ldDecidedHint")}</p>
            {decided.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("ldNoneDecided")}</p>
            ) : (
              <ul className="space-y-2">
                {decided.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="min-w-0">
                      <Link href={clientPageHref(c.id)} className="block truncate font-medium hover:text-primary hover:underline">{c.name}</Link>
                      <span className="block truncate text-xs text-muted-foreground">{c.convertedAt ? date(c.convertedAt) : `${date(c.updatedAt)} · ${c.lostReason}`}</span>
                    </span>
                    <Badge variant="outline" className={cn("shrink-0 border-transparent", c.convertedAt ? "bg-success-soft text-success-foreground" : "bg-muted text-muted-foreground")}>{t(c.convertedAt ? "ldWon" : "ldLost")}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ConvertDialog lead={converting} onClose={() => setConverting(null)} hasDeal={!!converting && openDealsOf(converting.id).length > 0} />
      <DropDialog lead={dropping} onClose={() => setDropping(null)} />

      <DataTableEntityFormSheet
        open={adding}
        onOpenChange={setAdding}
        mode="create"
        createTitle={t("ldAdd")}
        editTitle={t("ldAdd")}
        description={t("ldAddHint")}
        isSubmitting={create.isPending}
        onSubmit={() => formRef.current?.submit()}
      >
        {adding && <ClientForm ref={formRef} existingClients={clients} employees={employees} currency={workspace.currency} onValid={(input: ClientInput) => create.mutate({ ...input, status: ClientStatus.LEAD }, { onSuccess: () => setAdding(false) })} />}
      </DataTableEntityFormSheet>
    </div>
  )
}

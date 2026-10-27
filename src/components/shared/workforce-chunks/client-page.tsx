"use client"

import * as React from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { AlertTriangle, ArrowLeft, ArrowLeftRight, CalendarDays, CheckCircle, XCircle, FolderKanban, Globe, Handshake, ListChecks, Mail, MessagesSquare, Pencil, Phone, Plus, Receipt, Wallet } from "@/components/ui/carbon/icons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmptyState, ListSkeleton } from "@/components/ui/empty-state"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { Tabs } from "@/components/ui/tabs"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClientMutations, useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useClientFigures } from "@/hooks/workforce/use-client-figures"
import { useClientInvoices } from "@/hooks/workforce/use-work-billing"
import { useProjects, useTasks } from "@/hooks/workforce/use-work-projects"
import { useDeals } from "@/hooks/workforce/use-deals"
import { useFollowUps } from "@/hooks/workforce/use-crm"
import { useQuotes } from "@/hooks/workforce/use-quotes"
import { useWorkspaceSettings } from "@/hooks/workforce/use-settings"
import { fieldsFor } from "@/lib/workforce/custom-fields"
import { projectStatsById, todayIso } from "@/lib/workforce/project-metrics"
import { sortFollowUps } from "@/lib/workforce/follow-ups"
import { isOpenDeal } from "@/lib/workforce/deals"
import type { ClientFollowUp } from "@/types/work-crm"
import { cn } from "@/lib/utils"
import { ClientStatus, type Client, type ClientInput } from "@/types/workforce"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { PortalAccessManager } from "../work-portal-chunks/portal-access-manager"
import { FeedbackSection } from "../work-portal-chunks/satisfaction"
import { ClientActivitySection, ClientBalanceSection, ClientContractsSection } from "./client-crm-sections"
import { ClientForm, type ClientFormHandle } from "./client-form"
import { HEALTH_BADGE, LogDialog, QuickAction, Stars, Tile } from "./client-details-panel"
import { CLIENT_PAGE_TABS, tabFromQuery } from "./client-page-tabs"
import { ContactsSection, DealsSection, PageSection, ProjectsSection, QuotesInvoicesSection, Row } from "./client-page-sections"
import { HEALTH_CLASS, relativeDay } from "./clients-columns"
import { CustomFieldValuesList } from "./custom-fields"
import { ClientHistorySection, DuplicateNotice, MergeClientsDialog } from "./client-safety"
import { FollowUpDialog } from "./follow-up-dialog"
import { FollowUpList } from "./follow-up-list"
import { ConvertDialog, DropDialog } from "./lead-dialogs"
import { CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL, formatMoney } from "./workforce-labels"

/**
 * One client's page (CRM step 4): everything about the relationship, in tabs,
 * at an address that can be shared. The list's details panel opens it on the
 * matching tab.
 */
export default function ClientPage({ clientId }: { clientId: string }) {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const { data: clients = [], isLoading } = useClients()
  const client = clients.find((c) => c.id === clientId)

  if (isLoading) return <div className="p-4 md:p-6"><ListSkeleton /></div>
  if (!client) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title={t("cpNotFound")} />
        <EmptyState
          icon={Handshake}
          title={t("cpNotFound")}
          hint={t("cpNotFoundHint")}
          action={<Button variant="outline" asChild><Link href="/dashboard/clients"><ArrowLeft className="size-4 rtl:rotate-180" />{t("cpBack")}</Link></Button>}
        />
      </div>
    )
  }
  return <ClientPageBody client={client} clients={clients} canSeeMoney={can(authedUser, AdminPermissionsPlatform.INVOICES_READ)} canEdit={can(authedUser, AdminPermissionsPlatform.CLIENTS_UPDATE)} canMerge={can(authedUser, AdminPermissionsPlatform.CLIENTS_DELETE)} />
}

function ClientPageBody({ client: c, clients, canSeeMoney, canEdit, canMerge }: { client: Client; clients: Client[]; canSeeMoney: boolean; canEdit: boolean; canMerge: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const workspace = useCurrentWorkspace()
  const currency = workspace.currency
  const today = todayIso()
  const { data: employees = [] } = useEmployees()
  const { figures } = useClientFigures()
  const f = figures.get(c.id)
  const { data: invoices = [] } = useClientInvoices()
  const { data: projects = [] } = useProjects()
  const { data: tasks = [] } = useTasks()
  const { data: deals = [] } = useDeals()
  const { data: quotes = [] } = useQuotes()
  const { data: allFollowUps = [] } = useFollowUps()
  const { data: settings } = useWorkspaceSettings()
  const { update } = useClientMutations()

  const [formOpen, setFormOpen] = React.useState(false)
  const [logging, setLogging] = React.useState(false)
  const [planning, setPlanning] = React.useState(false)
  const [deciding, setDeciding] = React.useState<"convert" | "drop" | null>(null)
  const [editingFollowUp, setEditingFollowUp] = React.useState<ClientFollowUp | null>(null)
  // the merge dialog, with the other client when opened from the duplicate notice (CRM step 9)
  const [merging, setMerging] = React.useState<{ otherId?: string } | null>(null)
  const followUps = React.useMemo(() => sortFollowUps(allFollowUps.filter((x) => x.clientId === c.id)), [allFollowUps, c.id])
  const openFollowUps = followUps.filter((x) => !x.doneAt).length
  const formRef = React.useRef<ClientFormHandle>(null)

  // the tab is kept in the address (?tab=), billing only for people who may read invoices
  const allowed = CLIENT_PAGE_TABS.filter((tab) => tab !== "billing" || canSeeMoney)
  const initialTab = tabFromQuery(useSearchParams().get("tab"), allowed)
  const keepTab = (id: string) => {
    const url = new URL(window.location.href)
    if (id === "overview") url.searchParams.delete("tab")
    else url.searchParams.set("tab", id)
    window.history.replaceState(window.history.state, "", url)
  }

  const money = (n: number) => formatMoney(n, currency, locale)
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(`${iso.slice(0, 10)}T00:00:00`))
  const contact = c.contacts.find((x) => x.isPrimary)
  const phone = contact?.phone || c.phone
  const email = contact?.email || c.email
  const manager = employees.find((e) => e.id === c.accountManagerId)
  const ownProjects = projects.filter((p) => p.clientId === c.id)
  const stats = React.useMemo(() => projectStatsById(ownProjects, tasks, today), [ownProjects, tasks, today])

  const cards: MetricCardItem[] = [
    { key: "projects", title: t("projects"), value: f?.projects.total ?? 0, footer: { icon: FolderKanban, text: t("clProjectsTip", { active: f?.projects.inProgress ?? 0, done: f?.projects.completed ?? 0 }) } },
    canSeeMoney
      ? { key: "deals", title: t("cdOpenDeals"), value: money(f?.openDeals.amount ?? 0), footer: { icon: Handshake, text: t("cpDealsHint", { n: f?.openDeals.count ?? 0, weighted: money(f?.openDeals.weighted ?? 0) }) } }
      : { key: "deals", title: t("cdOpenDeals"), value: f?.openDeals.count ?? 0, footer: { icon: Handshake, text: t("cpDealsCountHint") } },
    canSeeMoney
      ? { key: "billed", title: t("clBilledYear"), value: money(f?.billedThisYear ?? 0), footer: { icon: Receipt, text: t("clBilledYearHint") } }
      : { key: "contacts", title: t("contacts"), value: c.contacts.length, footer: { icon: MessagesSquare, text: t("peopleAtClients") } },
    canSeeMoney
      ? { key: "owed", title: t("clOwed"), value: money(f?.outstanding ?? 0), valueClassName: f && f.overdue > 0 ? "text-destructive" : undefined, footer: { icon: f && f.overdue > 0 ? AlertTriangle : Wallet, text: f && f.overdue > 0 ? t("cpOverdueHint", { amount: money(f.overdue), days: f.oldestLateDays }) : t("cpNothingLate") } }
      : { key: "next", title: t("cdNextFollowUp"), value: f?.nextFollowUp ? date(f.nextFollowUp.dueDate) : "—", footer: { icon: CalendarDays, text: f?.nextFollowUp?.title ?? t("cdNoFollowUp") } },
  ]

  const overview = (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-6">
        <PageSection title={t("cdOverview")}>
          <div className="grid gap-2 sm:grid-cols-2">
            <Tile icon={MessagesSquare} label={t("clLastContact")} value={f?.lastContact ? date(f.lastContact) : t("clNever")} sub={f?.lastContact ? relativeDay(f.lastContact, today, locale) : undefined} />
            <Tile icon={CalendarDays} label={t("cdNextFollowUp")} value={f?.nextFollowUp ? date(f.nextFollowUp.dueDate) : t("cdNoFollowUp")} sub={f?.nextFollowUp?.title} danger={!!f?.nextFollowUp && f.nextFollowUp.dueDate < today} />
          </div>
        </PageSection>
        <PageSection title={t("billing")}>
          <div className="divide-y divide-border">
            <Row label={t("billingEmail")} value={c.email} />
            {c.legalName && <Row label={t("legalName")} value={c.legalName} />}
            {c.ice && <Row label={t("iceNumber")} value={<span className="font-mono">{c.ice}</span>} />}
            <Row label={t("taxId")} value={c.taxId || "—"} />
            <Row label={t("address")} value={c.address || "—"} />
            {c.billingAddress && <Row label={t("billingAddress")} value={c.billingAddress} />}
            {c.currency && <Row label={t("invoiceCurrency")} value={c.currency} />}
            <Row label={t("rate")} value={c.hourlyRate ? `${formatMoney(c.hourlyRate, c.currency ?? currency, locale)}/h` : t("standardRates")} />
            <Row label={t("paymentTerms")} value={t("netDays", { days: c.paymentTermsDays })} />
            {canSeeMoney && c.creditLimit ? <Row label={t("cpCreditLimit")} value={formatMoney(c.creditLimit, currency, locale)} /> : null}
            <Row label={t("accountManager")} value={manager?.name ?? "—"} />
          </div>
        </PageSection>
        {(c.rateCard?.length ?? 0) > 0 && (
          <PageSection title={t("rateCard")}>
            <div className="divide-y divide-border">
              {c.rateCard!.map((r) => (
                <Row key={r.id} label={r.employeeId ? (employees.find((e) => e.id === r.employeeId)?.name ?? "—") : (r.jobTitle ?? "—")} value={`${formatMoney(r.rate, c.currency ?? currency, locale)}/h`} />
              ))}
            </div>
          </PageSection>
        )}
        {fieldsFor(settings?.customFields, "client").some((d) => c.customFields?.[d.id]) && (
          <PageSection title={t("customFields")}>
            <CustomFieldValuesList entity="client" values={c.customFields} />
          </PageSection>
        )}
        {c.notes && (
          <PageSection title={t("notes")}>
            <p className="whitespace-pre-line text-sm">{c.notes}</p>
          </PageSection>
        )}
      </div>
      <div className="space-y-6">
        {f?.health && (
          <PageSection title={t("clHealth")}>
            <div className={cn("flex items-start gap-2 rounded-2xl px-3 py-2 text-sm", HEALTH_BADGE[f.health.level])}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", HEALTH_CLASS[f.health.level])} aria-hidden />
              <span className="font-semibold">{t(`clHealth_${f.health.level}`)}</span>
            </div>
            {f.health.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {f.health.reasons.map((r) => <li key={r}>{t(`clReason_${r}`)}</li>)}
              </ul>
            )}
          </PageSection>
        )}
        <PageSection title={t("cdSatisfaction")}>
          {f && f.satisfaction.count > 0 ? (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-sm">
                <Stars value={f.satisfaction.average ?? 0} />
                <span className="font-semibold tabular-nums">{f.satisfaction.average}</span>
                <span className="text-muted-foreground">({t("cdAnswers", { n: f.satisfaction.count })})</span>
                {f.satisfaction.nps !== null && <span className="ms-auto text-xs text-muted-foreground">NPS {f.satisfaction.nps}</span>}
              </p>
              {f.satisfaction.latest?.comment && <p className="rounded-2xl border border-border p-3 text-sm">“{f.satisfaction.latest.comment}”</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("cdNoAnswers")}</p>
          )}
        </PageSection>
        {(c.tags?.length || c.leadSource) && (
          <PageSection title={t("clTags")}>
            <div className="flex flex-wrap gap-1.5">
              {c.tags?.map((tag) => <Badge key={tag} variant="outline" className="border-transparent bg-muted text-muted-foreground">{tag}</Badge>)}
              {c.leadSource && <Badge variant="outline" className="border-transparent bg-info-soft text-info-foreground">{t("cpSource", { source: t(`clSource_${c.leadSource}`) })}</Badge>}
            </div>
          </PageSection>
        )}
      </div>
    </div>
  )

  const tabs = [
    { id: "overview", label: t("cpTabOverview"), content: overview },
    {
      id: "contacts",
      label: t("cpTabContacts", { n: c.contacts.length }),
      content: (
        <div className="space-y-6">
          <ContactsSection client={c} canEdit={canEdit} saving={update.isPending} onSave={(contacts) => update.mutate({ id: c.id, input: { contacts } })} />
          {c.contacts.length > 0 && (
            <PageSection title={t("clientPortal")}>
              <PortalAccessManager clientId={c.id} />
            </PageSection>
          )}
        </div>
      ),
    },
    {
      id: "followups",
      label: t("cpTabFollowUps", { n: openFollowUps }),
      content: (
        <PageSection title={t("followUps")} action={canEdit && <Button size="sm" variant="outline" onClick={() => setPlanning(true)}><Plus className="size-4" />{t("fuPlan")}</Button>}>
          <FollowUpList
            items={followUps}
            showClient={false}
            canEdit={canEdit}
            onEdit={setEditingFollowUp}
            empty={<p className="rounded-2xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t("fuNoneForClient")}</p>}
          />
        </PageSection>
      ),
    },
    { id: "deals", label: t("cpTabDeals", { n: deals.filter((d) => d.clientId === c.id).length }), content: <DealsSection deals={deals.filter((d) => d.clientId === c.id)} employees={employees} currency={currency} contacts={c.contacts} /> },
    ...(canSeeMoney
      ? [
          {
            id: "billing",
            label: t("cpTabBilling"),
            content: (
              <div className="space-y-6">
                <PageSection title={t("balance")}>
                  <ClientBalanceSection client={c} currency={currency} />
                </PageSection>
                <QuotesInvoicesSection quotes={quotes.filter((q) => q.clientId === c.id)} invoices={invoices.filter((i) => i.clientId === c.id)} allInvoices={invoices} currency={currency} />
              </div>
            ),
          },
        ]
      : []),
    { id: "projects", label: t("cpTabProjects", { n: ownProjects.length }), content: <ProjectsSection projects={ownProjects} stats={stats} /> },
    { id: "contracts", label: t("cdContracts"), content: <PageSection title={t("cdContracts")}><ClientContractsSection client={c} currency={currency} /></PageSection> },
    {
      id: "activity",
      label: t("cpTabActivity"),
      content: (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <PageSection title={t("activity")} action={<Button size="sm" variant="outline" onClick={() => setLogging(true)}><MessagesSquare className="size-4" />{t("cdLog")}</Button>}>
            <ClientActivitySection client={c} employees={employees} />
          </PageSection>
          <PageSection title={t("cdSatisfaction")}>
            <FeedbackSection clientId={c.id} />
          </PageSection>
        </div>
      ),
    },
    {
      id: "history",
      label: t("csHistory"),
      content: (
        <PageSection title={t("csHistory")}>
          <ClientHistorySection client={c} employees={employees} currency={currency} />
        </PageSection>
      ),
    },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title={c.name}
        badge={
          <span className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={CLIENT_STATUS_CLASS[c.status]}>{t(CLIENT_STATUS_LABEL[c.status])}</Badge>
            {f?.health && <Badge variant="outline" className={cn("border-transparent", HEALTH_BADGE[f.health.level])}>{t(`clHealth_${f.health.level}`)}</Badge>}
          </span>
        }
        description={[contact ? `${contact.name}${contact.position ? ` · ${contact.position}` : ""}` : null, c.industry, c.address].filter(Boolean).join(" · ") || c.email}
        actions={
          <>
            <Button variant="outline" asChild><Link href="/dashboard/clients"><ArrowLeft className="size-4 rtl:rotate-180" />{t("cpBack")}</Link></Button>
            <Button variant="outline" onClick={() => setLogging(true)}><MessagesSquare className="size-4" />{t("cdLog")}</Button>
            {canEdit && <Button variant="outline" onClick={() => setPlanning(true)}><ListChecks className="size-4" />{t("fuPlan")}</Button>}
            {canEdit && c.status === ClientStatus.LEAD && <Button variant="outline" onClick={() => setDeciding("drop")}><XCircle className="size-4" />{t("ldDrop")}</Button>}
            {canEdit && c.status === ClientStatus.LEAD && <Button variant="outline" onClick={() => setDeciding("convert")}><CheckCircle className="size-4" />{t("ldConvert")}</Button>}
            {canMerge && <Button variant="outline" onClick={() => setMerging({})}><ArrowLeftRight className="size-4" />{t("csMergeWith")}</Button>}
            {canEdit && <Button variant="primary" onClick={() => setFormOpen(true)}><Pencil className="size-4" />{t("edit")}</Button>}
          </>
        }
      >
        <div className="flex gap-2">
          <QuickAction label={phone ? t("cdCall", { phone }) : t("cdNoPhone")} href={phone ? `tel:${phone.replace(/\s/g, "")}` : undefined} icon={Phone} />
          <QuickAction label={email ? t("cdEmail", { email }) : t("clNoEmail")} href={email ? `mailto:${email}` : undefined} icon={Mail} />
          <QuickAction label={c.website ? t("cdWebsite") : t("cdNoWebsite")} href={c.website} icon={Globe} external />
        </div>
      </PageHeader>

      <DuplicateNotice client={c} clients={clients} canMerge={canMerge} onMerge={(otherId) => setMerging({ otherId })} />

      <MetricCardGrid cards={cards} columnsClassName="grid-cols-1 sm:grid-cols-2 xl:grid-cols-4" />

      <Tabs defaultTabId={initialTab} onChange={(tab) => keepTab(tab.id)} tabs={tabs} />

      <ConvertDialog lead={deciding === "convert" ? c : null} onClose={() => setDeciding(null)} hasDeal={deals.some((d) => d.clientId === c.id && isOpenDeal(d))} />
      <DropDialog lead={deciding === "drop" ? c : null} onClose={() => setDeciding(null)} />
      {merging && <MergeClientsDialog client={c} clients={clients} employees={employees} currency={currency} initialOtherId={merging.otherId} onClose={() => setMerging(null)} />}
      <LogDialog open={logging} onOpenChange={setLogging} client={c} canPlan={canEdit} />
      <FollowUpDialog
        open={planning || !!editingFollowUp}
        onOpenChange={(o) => { if (!o) { setPlanning(false); setEditingFollowUp(null) } }}
        followUp={editingFollowUp}
        defaults={{ clientId: c.id, contactId: contact?.id }}
        lockClient
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode="edit"
        createTitle={t("addClient")}
        editTitle={t("editClient")}
        description={t("editClientDescription")}
        isSubmitting={update.isPending}
        onSubmit={() => formRef.current?.submit()}
      >
        <ClientForm
          ref={formRef}
          client={c}
          existingClients={clients}
          employees={employees}
          currency={currency}
          onValid={(input: ClientInput) => update.mutate({ id: c.id, input }, { onSuccess: () => setFormOpen(false) })}
        />
      </DataTableEntityFormSheet>
    </div>
  )
}

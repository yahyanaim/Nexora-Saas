"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { AlertTriangle, CheckCircle, Download, Handshake, Mail, Plus, Receipt, Sparkles, Tag, Users } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ClientStatus, LeadSource, type Client, type ClientInput } from "@/types/workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClientMutations, useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { useClientFigures } from "@/hooks/workforce/use-client-figures"
import { cleanTags, tagsInUse } from "@/lib/workforce/client-figures"
import { updateClientApi } from "@/lib/api/clients-api"
import { bccMailto, clientRecipients } from "@/lib/ui/mail-list"
import { exportToCsv } from "@/lib/utils/export-data"
import { toast } from "@/lib/utils/toast"
import { translateError } from "@/lib/errors/translate-error"
import { cn } from "@/lib/utils"
import { CLIENT_FILTER_COLUMNS, getClientsColumns } from "./clients-columns"
import { ClientForm, type ClientFormHandle } from "./client-form"
import { ClientProfileSheet } from "./client-profile-sheet"
import { ClientDetailsPanel } from "./client-details-panel"
import { formatMoney } from "./workforce-labels"

type StatusPill = "all" | ClientStatus
const PILLS: { value: StatusPill; label: string }[] = [
  { value: "all", label: "all" },
  { value: ClientStatus.ACTIVE, label: "active" },
  { value: ClientStatus.LEAD, label: "leads" },
  { value: ClientStatus.ARCHIVED, label: "archived" },
]

/**
 * The CRM clients list (CRM step 2), laid out like the SalesHub reference in
 * Nexora's design: header actions, status pills with counts, a table with how
 * to reach each client and where the relationship stands, and bulk actions.
 */
export default function ClientsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const queryClient = useQueryClient()
  const { data: clients = [], isLoading } = useClients()
  const { data: employees = [] } = useEmployees()
  const { figures } = useClientFigures()
  const { create, update, remove } = useClientMutations()

  const canCreate = can(authedUser, AdminPermissionsPlatform.CLIENTS_CREATE)
  const canEdit = can(authedUser, AdminPermissionsPlatform.CLIENTS_UPDATE)
  const canDelete = can(authedUser, AdminPermissionsPlatform.CLIENTS_DELETE)
  const canSeeMoney = can(authedUser, AdminPermissionsPlatform.INVOICES_READ)

  const [pill, setPill] = useState<StatusPill>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [viewing, setViewing] = useState<Client | null>(null)
  // the client shown in the details panel (CRM step 3); kept by id so edits show at once
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? (clients.find((c) => c.id === selectedId) ?? null) : null
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [tagging, setTagging] = useState<{ clients: Client[]; done: () => void } | null>(null)
  const [tag, setTag] = useState("")
  const formRef = useRef<ClientFormHandle>(null)

  // ?client=<id> (e.g. from an invoice missing the client's ICE) opens that client's form once
  const linkedId = useSearchParams().get("client")
  const [handledLink, setHandledLink] = useState<string | null>(null)
  const linked = linkedId && linkedId !== handledLink ? clients.find((c) => c.id === linkedId) : undefined
  if (linked) {
    setHandledLink(linkedId)
    if (canEdit) {
      setEditing(linked)
      setFormOpen(true)
    } else setViewing(linked)
  }

  const openForm = (client: Client | null) => {
    setEditing(client)
    setFormOpen(true)
  }

  const handleValid = (input: ClientInput) => {
    const close = { onSuccess: () => setFormOpen(false) }
    if (editing) update.mutate({ id: editing.id, input }, close)
    else create.mutate(input, close)
  }

  const counts = useMemo(() => {
    const by = (s: ClientStatus) => clients.filter((c) => c.status === s).length
    return { all: clients.length, [ClientStatus.ACTIVE]: by(ClientStatus.ACTIVE), [ClientStatus.LEAD]: by(ClientStatus.LEAD), [ClientStatus.ARCHIVED]: by(ClientStatus.ARCHIVED) } as Record<StatusPill, number>
  }, [clients])
  const shown = useMemo(() => (pill === "all" ? clients : clients.filter((c) => c.status === pill)), [clients, pill])

  const columns = useMemo(
    () =>
      getClientsColumns({
        t,
        locale,
        employees,
        currency: workspace.currency,
        figures,
        canSeeMoney,
        canSelect: true,
        canEdit,
        canDelete,
        onView: (c: Client) => setSelectedId(c.id),
        selectedId,
        onEdit: openForm,
        onDelete: setDeleting,
      }),
    [t, locale, employees, workspace.currency, figures, canSeeMoney, canEdit, canDelete, selectedId]
  )

  const cards = useMemo<MetricCardItem[]>(() => {
    const all = [...figures.values()]
    const money = (n: number) => formatMoney(n, workspace.currency, locale)
    const lateClients = all.filter((f) => f.overdue > 0).length
    const lateFollowUps = all.reduce((s, f) => s + f.lateFollowUps, 0)
    return [
      { key: "active", title: t("activeClients"), value: counts[ClientStatus.ACTIVE], valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("clActiveHint", { n: all.filter((f) => f.health?.level === "at_risk").length }) } },
      { key: "leads", title: t("leads"), value: counts[ClientStatus.LEAD], valueClassName: "text-info-foreground", footer: { icon: Sparkles, text: t("notYetSigned") } },
      canSeeMoney
        ? { key: "billed", title: t("clBilledYear"), value: money(all.reduce((s, f) => s + f.billedThisYear, 0)), footer: { icon: Receipt, text: t("clBilledYearHint") } }
        : { key: "contacts", title: t("contacts"), value: clients.reduce((s, c) => s + c.contacts.length, 0), valueClassName: "text-primary", footer: { icon: Users, text: t("peopleAtClients") } },
      canSeeMoney
        ? { key: "overdue", title: t("clOverdue"), value: money(all.reduce((s, f) => s + f.overdue, 0)), valueClassName: lateClients ? "text-destructive" : undefined, footer: { icon: AlertTriangle, text: t("clOverdueHint", { n: lateClients }) } }
        : { key: "followups", title: t("clLateFollowUps"), value: lateFollowUps, valueClassName: lateFollowUps ? "text-destructive" : undefined, footer: { icon: Handshake, text: t("clLateFollowUpsHint") } },
    ]
  }, [figures, counts, clients, canSeeMoney, workspace.currency, locale, t])

  // e-mail: the selected clients (or those shown) in BCC; copied when too many for one link
  const emailClients = async (list: Client[]) => {
    const to = clientRecipients(list)
    if (!to.length) return toast.error(t("clNoEmail"))
    const href = bccMailto(to)
    if (href) {
      window.location.href = href
      return
    }
    try {
      await navigator.clipboard.writeText(to.join(", "))
      toast.success(t("clEmailsCopied", { n: to.length }))
    } catch {
      toast.error(t("clNoEmail"))
    }
  }

  const exportRows = (rows: Client[]) => {
    const name = (id?: string) => employees.find((e) => e.id === id)?.name ?? ""
    exportToCsv(
      rows.map((c) => {
        const f = figures.get(c.id)
        const contact = c.contacts.find((x) => x.isPrimary)
        return {
          name: c.name,
          contact: contact?.name ?? "",
          email: contact?.email || c.email,
          phone: contact?.phone || c.phone || "",
          industry: c.industry ?? "",
          status: t(c.status === ClientStatus.LEAD ? "lead" : c.status),
          manager: name(c.accountManagerId),
          tags: (c.tags ?? []).join(" | "),
          source: c.leadSource ? t(`clSource_${c.leadSource}`) : "",
          projects: f?.projects.total ?? 0,
          ...(canSeeMoney ? { billed: f?.billedThisYear ?? 0, owed: f?.outstanding ?? 0, overdue: f?.overdue ?? 0 } : {}),
          lastContact: f?.lastContact ?? "",
        }
      }),
      `clients-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: "name", label: t("client") },
        { key: "contact", label: t("primaryContact") },
        { key: "email", label: t("email") },
        { key: "phone", label: t("phone") },
        { key: "industry", label: t("industry") },
        { key: "status", label: t("status") },
        { key: "manager", label: t("accountManager") },
        { key: "tags", label: t("clTags") },
        { key: "source", label: t("clLeadSource") },
        { key: "projects", label: t("projects") },
        ...(canSeeMoney ? [{ key: "billed" as const, label: t("clBilledYear") }, { key: "owed" as const, label: t("clOwed") }, { key: "overdue" as const, label: t("clOverdue") }] : []),
        { key: "lastContact", label: t("clLastContact") },
      ]
    )
  }

  const addTag = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagging || !tag.trim()) return
    try {
      for (const c of tagging.clients) await updateClientApi(workspace.id, c.id, { tags: cleanTags([...(c.tags ?? []), tag]) })
      await queryClient.invalidateQueries({ queryKey: ["clients", workspace.id] })
      toast.success(t("clTagAdded", { tag: tag.trim(), n: tagging.clients.length }))
      tagging.done()
      setTagging(null)
      setTag("")
    } catch (err) {
      toast.error(translateError(err, t))
    }
  }

  const managers = employees.filter((e) => clients.some((c) => c.accountManagerId === e.id))
  const industries = [...new Set(clients.map((c) => c.industry).filter((x): x is string => !!x))].sort()
  const tags = tagsInUse(clients)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void emailClients(shown)} disabled={!shown.length}>
              <Mail className="size-4" />
              {t("clEmailAll")}
            </Button>
            {canCreate && (
              <Button variant="primary" onClick={() => openForm(null)}>
                <Plus className="size-4" />
                {t("addClient")}
              </Button>
            )}
          </>
        }
      >
        {/* status pills with live counts, as in the reference */}
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("status")}>
          {PILLS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={pill === p.value}
              onClick={() => setPill(p.value)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                pill === p.value ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {t(p.label)}
              <span className={cn("tabular-nums", pill === p.value ? "text-primary" : "text-muted-foreground")}>({counts[p.value]})</span>
            </button>
          ))}
        </div>
      </PageHeader>

      <div className={cn("grid items-start gap-6", selected && "xl:grid-cols-[minmax(0,1fr)_24rem]")}>
      <div className="min-w-0 space-y-6">
      <MetricCardGrid cards={cards} isLoading={isLoading} columnsClassName={cn("grid-cols-1 sm:grid-cols-2", selected ? "2xl:grid-cols-4" : "xl:grid-cols-4")} />

      <DataTable
        title={t("clients")}
        isLoading={isLoading}
        columns={columns}
        data={shown}
        searchColumnId="name"
        searchPlaceholder={t("clSearch")}
        defaultColumnVisibility={CLIENT_FILTER_COLUMNS}
        defaultSorting={[{ id: "name", desc: false }]}
        showRange
        numberedPages
        savedViewsKey="erp-clients"
        exportOptions={[{ label: t("exportCsv"), icon: Download, onClick: (rows) => exportRows(rows as Client[]) }]}
        renderBulkActions={(rows, clear) => (
          <>
            <Button variant="outline" size="sm" onClick={() => void emailClients(rows)}>
              <Mail className="size-4" />
              {t("clEmailSelected")}
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setTagging({ clients: rows, done: clear })}>
                <Tag className="size-4" />
                {t("clAddTag")}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => exportRows(rows)}>
              <Download className="size-4" />
              {t("export")}
            </Button>
          </>
        )}
        filters={[
          { columnId: "manager", title: t("accountManager"), options: managers.map((e) => ({ label: e.name, value: e.id })) },
          { columnId: "industry", title: t("industry"), options: industries.map((i) => ({ label: i, value: i })) },
          { columnId: "tags", title: t("clTags"), options: tags.map((x) => ({ label: x, value: x })) },
          { columnId: "leadSource", title: t("clLeadSource"), options: Object.values(LeadSource).map((s) => ({ label: t(`clSource_${s}`), value: s })) },
          { columnId: "health", title: t("clHealth"), options: (["good", "watch", "at_risk"] as const).map((h) => ({ label: t(`clHealth_${h}`), value: h })) },
        ].filter((f) => f.options.length > 0)}
      />

      </div>

      <ClientDetailsPanel
        client={selected}
        figures={selected ? figures.get(selected.id) : undefined}
        employees={employees}
        currency={workspace.currency}
        canSeeMoney={canSeeMoney}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setSelectedId(null)}
        onEdit={openForm}
        onDelete={setDeleting}
        onOpenProfile={setViewing}
      />
      </div>

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={editing ? "edit" : "create"}
        createTitle={t("addClient")}
        editTitle={t("editClient")}
        description={editing ? t("editClientDescription") : t("addClientDescription")}
        isSubmitting={create.isPending || update.isPending}
        onSubmit={() => formRef.current?.submit()}
      >
        <ClientForm ref={formRef} client={editing ?? undefined} existingClients={clients} employees={employees} currency={workspace.currency} onValid={handleValid} />
      </DataTableEntityFormSheet>

      <ClientProfileSheet client={viewing} employees={employees} currency={workspace.currency} onOpenChange={(open) => !open && setViewing(null)} />

      <Dialog open={!!tagging} onOpenChange={(open) => !open && setTagging(null)}>
        <DialogContent className="max-w-md">
          <form onSubmit={addTag}>
            <DialogHeader>
              <DialogTitle>{t("clTagTitle", { n: tagging?.clients.length ?? 0 })}</DialogTitle>
              <DialogDescription>{t("clTagHint")}</DialogDescription>
            </DialogHeader>
            <Label htmlFor="cl-tag">{t("clTagName")}</Label>
            <Input id="cl-tag" className="mt-1.5" list="cl-tag-list" maxLength={30} autoFocus value={tag} onChange={(e) => setTag(e.target.value)} placeholder={t("clTagPlaceholder")} />
            <datalist id="cl-tag-list">{tags.map((x) => <option key={x} value={x} />)}</datalist>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setTagging(null)}>{t("cancel")}</Button>
              <Button type="submit" disabled={!tag.trim()}>{t("clAddTag")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteClient")}
        description={t("deleteClientConfirmation", { name: deleting?.name ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              if (deleting.id === selectedId) setSelectedId(null)
              setDeleting(null)
            },
          })
        }
      />
    </div>
  )
}

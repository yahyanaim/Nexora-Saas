"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { SpaceAvatar } from "@/components/ui/space-avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { AlertTriangle, Download, Mail, Pencil, Phone, Plus, Star, Trash2, Users } from "@/components/ui/carbon/icons"
import { PageHeader } from "@/components/shared/page-header"
import { Link } from "@/i18n/navigation"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { useClientMutations, useClients } from "@/hooks/workforce/use-workforce"
import { can } from "@/lib/permissions/can"
import { allContacts, contactEmails, contactPhones, type ContactRow } from "@/lib/workforce/leads"
import { bccMailto } from "@/lib/ui/mail-list"
import { exportToCsv } from "@/lib/utils/export-data"
import { toast } from "@/lib/utils/toast"
import { AdminPermissionsPlatform as P } from "@/types/roles"
import { ClientStatus, ContactRole, type ClientContact } from "@/types/workforce"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableColumnHeader } from "../data-table-chunks/data-table-column-header"
import { DataTableRowActions } from "../data-table-chunks/data-table-row-actions"
import { includesFilter, CLIENT_STATUS_CLASS, CLIENT_STATUS_LABEL } from "./workforce-labels"
import { clientPageHref } from "./client-page-tabs"
import { blankContact, ContactDialog, withContact, withoutContact } from "./contact-edit"

/**
 * Every person the company deals with, across clients and leads (CRM step 6):
 * how to reach them, their part in decisions, and the client they work for.
 * Contacts stay attached to their client, so they are saved through it.
 */
export default function ContactsPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const canEdit = can(authedUser, P.CLIENTS_UPDATE)
  const { data: clients = [], isLoading } = useClients()
  const { update } = useClientMutations()
  const rows = React.useMemo(() => allContacts(clients.filter((c) => c.status !== ClientStatus.ARCHIVED)), [clients])
  const [editing, setEditing] = React.useState<{ row?: ContactRow; contact: ClientContact } | null>(null)
  const [removing, setRemoving] = React.useState<ContactRow | null>(null)

  const save = (contact: ClientContact, clientId?: string) => {
    const client = editing?.row?.client ?? clients.find((c) => c.id === clientId)
    if (!client) return
    update.mutate({ id: client.id, input: { contacts: withContact(client.contacts, contact) } }, { onSuccess: () => setEditing(null) })
  }

  const emailRows = async (list: ContactRow[]) => {
    const to = [...new Set(list.map((r) => r.contact.email.trim()).filter(Boolean))]
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
  const exportRows = (list: ContactRow[]) =>
    exportToCsv(
      list.map(({ contact: c, client }) => ({
        name: c.name,
        client: client.name,
        position: c.position ?? "",
        role: c.role ? t(`ctRole_${c.role}`) : "",
        main: c.isPrimary ? "✓" : "",
        emails: contactEmails(c).join("; "),
        phones: contactPhones(c).join("; "),
        linkedin: c.linkedin ?? "",
      })),
      "contacts"
    )

  const activeWithout = clients.filter((c) => c.status === ClientStatus.ACTIVE && c.contacts.length === 0).length
  const cards: MetricCardItem[] = [
    { key: "all", title: t("contacts"), value: rows.length, footer: { icon: Users, text: t("ctAtClients", { n: new Set(rows.map((r) => r.client.id)).size }) } },
    { key: "deciders", title: t("ctDecisionMakers"), value: rows.filter((r) => r.contact.role === ContactRole.DECISION_MAKER).length, footer: { icon: Star, text: t("ctDecisionMakersHint") } },
    { key: "nophone", title: t("ctNoPhone"), value: rows.filter((r) => contactPhones(r.contact).length === 0).length, footer: { icon: Phone, text: t("ctNoPhoneHint") } },
    { key: "orphans", title: t("ctClientsWithout"), value: activeWithout, valueClassName: activeWithout ? "text-warning-foreground" : undefined, footer: { icon: AlertTriangle, text: t("ctClientsWithoutHint") } },
  ]

  const columns = React.useMemo<ColumnDef<ContactRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)} aria-label={t("clSelectAll")} />
        ),
        cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(v) => row.toggleSelected(!!v)} aria-label={t("clSelect", { name: row.original.contact.name })} />,
      },
      {
        id: "name",
        accessorFn: (r) => r.contact.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("name")} />,
        filterFn: (row, _id, value: string) => {
          const q = String(value ?? "").trim().toLowerCase()
          const { contact: c, client } = row.original
          return !q || [c.name, c.position ?? "", client.name, ...contactEmails(c), ...contactPhones(c)].some((f) => f.toLowerCase().includes(q))
        },
        cell: ({ row }) => {
          const c = row.original.contact
          return (
            <span className="flex items-center gap-3">
              <SpaceAvatar name={c.name} size="md" />
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-1.5 truncate font-medium">
                  {c.name}
                  {c.isPrimary && <Star className="size-3.5 fill-warning text-warning" aria-label={t("primaryContact")} role="img" />}
                </span>
                <span className="truncate text-xs text-muted-foreground">{c.position ?? "—"}</span>
              </span>
            </span>
          )
        },
      },
      {
        id: "client",
        accessorFn: (r) => r.client.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("client")} />,
        filterFn: (row, _id, v) => includesFilter(row.original.client.id, v),
        cell: ({ row }) => {
          const client = row.original.client
          return (
            <span className="flex flex-wrap items-center gap-1.5">
              <Link href={clientPageHref(client.id, "contacts")} className="text-sm font-medium hover:text-primary hover:underline">{client.name}</Link>
              {client.status === ClientStatus.LEAD && <Badge variant="outline" className={CLIENT_STATUS_CLASS[client.status]}>{t(CLIENT_STATUS_LABEL[client.status])}</Badge>}
            </span>
          )
        },
      },
      {
        id: "role",
        accessorFn: (r) => r.contact.role ?? "",
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("cpRole")} />,
        filterFn: (row, id, v) => includesFilter(row.getValue(id), v),
        cell: ({ row }) => (row.original.contact.role ? <Badge variant="outline" className="border-transparent bg-muted text-muted-foreground">{t(`ctRole_${row.original.contact.role}`)}</Badge> : <span className="text-sm text-muted-foreground">—</span>),
      },
      {
        id: "email",
        accessorFn: (r) => r.contact.email,
        header: ({ column }) => <DataTableColumnHeader column={column} title={t("email")} />,
        cell: ({ row }) => {
          const emails = contactEmails(row.original.contact)
          return (
            <span className="flex items-center gap-1.5 text-sm">
              <a href={`mailto:${emails[0]}`} className="text-muted-foreground hover:text-foreground hover:underline">{emails[0]}</a>
              {emails.length > 1 && <span className="text-xs text-muted-foreground" title={emails.slice(1).join(", ")}>+{emails.length - 1}</span>}
            </span>
          )
        },
      },
      {
        id: "phone",
        accessorFn: (r) => contactPhones(r.contact)[0] ?? "",
        enableSorting: false,
        header: () => <span>{t("phone")}</span>,
        cell: ({ row }) => {
          const phones = contactPhones(row.original.contact)
          if (!phones.length) return <span className="text-sm text-muted-foreground">—</span>
          return (
            <span className="flex items-center gap-1.5 whitespace-nowrap text-sm">
              <a href={`tel:${phones[0]!.replace(/\s/g, "")}`} className="tabular-nums text-muted-foreground hover:text-foreground" dir="ltr">{phones[0]}</a>
              {phones.length > 1 && <span className="text-xs text-muted-foreground" title={phones.slice(1).join(", ")}>+{phones.length - 1}</span>}
            </span>
          )
        },
      },
      {
        id: "linkedin",
        accessorFn: (r) => r.contact.linkedin ?? "",
        enableSorting: false,
        header: () => <span>LinkedIn</span>,
        cell: ({ row }) => {
          const url = row.original.contact.linkedin
          return url ? <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline" aria-label={t("ctLinkedinOf", { name: row.original.contact.name })}>{t("ctProfile")}</a> : <span className="text-sm text-muted-foreground">—</span>
        },
      },
      { id: "status", accessorFn: (r) => r.client.status, filterFn: (row, id, v) => includesFilter(row.getValue(id), v), enableHiding: false },
      ...(canEdit
        ? [
            {
              id: "actions",
              enableHiding: false,
              cell: ({ row }) => (
                <DataTableRowActions
                  row={row.original}
                  actions={[
                    { label: t("edit"), icon: Pencil, onClick: (r: ContactRow) => setEditing({ row: r, contact: r.contact }) },
                    { label: t("delete"), icon: Trash2, onClick: setRemoving, variant: "destructive" as const, separatorBefore: true },
                  ]}
                />
              ),
            } satisfies ColumnDef<ContactRow>,
          ]
        : []),
    ],
    [t, canEdit]
  )

  const clientOptions = [...new Map(rows.map((r) => [r.client.id, r.client.name])).entries()].map(([value, label]) => ({ value, label }))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        actions={
          <>
            <Button variant="outline" onClick={() => void emailRows(rows)} disabled={!rows.length}><Mail className="size-4" />{t("clEmailAll")}</Button>
            {canEdit && <Button variant="primary" onClick={() => setEditing({ contact: blankContact() })}><Plus className="size-4" />{t("cpAddContact")}</Button>}
          </>
        }
      />
      <MetricCardGrid cards={cards} isLoading={isLoading} />
      <DataTable
        title={t("contacts")}
        isLoading={isLoading}
        columns={columns}
        data={rows}
        searchColumnId="name"
        searchPlaceholder={t("ctSearch")}
        defaultColumnVisibility={{ status: false }}
        defaultSorting={[{ id: "client", desc: false }]}
        showRange
        numberedPages
        savedViewsKey="erp-contacts"
        emptyMessage={t("noContactsYet")}
        exportOptions={[{ label: t("exportCsv"), icon: Download, onClick: (list) => exportRows(list as ContactRow[]) }]}
        renderBulkActions={(list) => (
          <>
            <Button variant="outline" size="sm" onClick={() => void emailRows(list)}><Mail className="size-4" />{t("clEmailSelected")}</Button>
            <Button variant="outline" size="sm" onClick={() => exportRows(list)}><Download className="size-4" />{t("export")}</Button>
          </>
        )}
        filters={[
          { columnId: "client", title: t("client"), options: clientOptions },
          { columnId: "role", title: t("cpRole"), options: Object.values(ContactRole).map((r) => ({ label: t(`ctRole_${r}`), value: r })) },
          { columnId: "status", title: t("ctClientType"), options: [{ label: t(CLIENT_STATUS_LABEL[ClientStatus.ACTIVE]), value: ClientStatus.ACTIVE }, { label: t(CLIENT_STATUS_LABEL[ClientStatus.LEAD]), value: ClientStatus.LEAD }] },
        ]}
      />

      <ContactDialog
        contact={editing?.contact ?? null}
        onClose={() => setEditing(null)}
        onSave={save}
        saving={update.isPending}
        clients={editing?.row ? undefined : clients.filter((c) => c.status !== ClientStatus.ARCHIVED)}
      />

      <Dialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cpRemoveContact", { name: removing?.contact.name ?? "" })}</DialogTitle>
            <DialogDescription>{t("cpRemoveContactHint")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>{t("cancel")}</Button>
            <Button
              variant="destructive"
              onClick={() => removing && update.mutate({ id: removing.client.id, input: { contacts: withoutContact(removing.client.contacts, removing.contact.id) } }, { onSuccess: () => setRemoving(null) })}
            >
              {t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


"use client"

import { useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle, Handshake, Plus, Sparkles, Users } from "@/components/ui/carbon/icons"
import { MetricCardGrid, type MetricCardItem } from "@/components/ui/metric-card-grid"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { PageHeader } from "@/components/shared/page-header"
import { DataTable } from "../data-table-chunks/data-table"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { can } from "@/lib/permissions/can"
import { AdminPermissionsPlatform } from "@/types/roles"
import { ClientStatus, type Client, type ClientInput } from "@/types/workforce"
import { useCurrentWorkspace } from "@/store/workspace-store"
import { useClientMutations, useClients, useEmployees } from "@/hooks/workforce/use-workforce"
import { getClientsColumns } from "./clients-columns"
import { ClientForm, type ClientFormHandle } from "./client-form"
import { ClientProfileSheet } from "./client-profile-sheet"
import { CLIENT_STATUS_LABEL } from "./workforce-labels"

export default function ClientsPage() {
  const t = useTranslations()
  const { authedUser } = useAuthGuard()
  const workspace = useCurrentWorkspace()
  const { data: clients = [], isLoading } = useClients()
  const { data: employees = [] } = useEmployees()
  const { create, update, remove } = useClientMutations()

  const canCreate = can(authedUser, AdminPermissionsPlatform.CLIENTS_CREATE)
  const canEdit = can(authedUser, AdminPermissionsPlatform.CLIENTS_UPDATE)
  const canDelete = can(authedUser, AdminPermissionsPlatform.CLIENTS_DELETE)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [viewing, setViewing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const formRef = useRef<ClientFormHandle>(null)

  const openForm = (client: Client | null) => {
    setEditing(client)
    setFormOpen(true)
  }

  const handleValid = (input: ClientInput) => {
    const close = { onSuccess: () => setFormOpen(false) }
    if (editing) update.mutate({ id: editing.id, input }, close)
    else create.mutate(input, close)
  }

  const columns = useMemo(
    () =>
      getClientsColumns({
        t,
        employees,
        currency: workspace.currency,
        canEdit,
        canDelete,
        onView: setViewing,
        onEdit: openForm,
        onDelete: setDeleting,
      }),
    [t, employees, workspace.currency, canEdit, canDelete]
  )

  const cards = useMemo<MetricCardItem[]>(() => {
    const count = (status: ClientStatus) => clients.filter((c) => c.status === status).length
    const contacts = clients.reduce((sum, c) => sum + c.contacts.length, 0)
    return [
      { key: "total", title: t("totalClients"), value: clients.length, footer: { icon: Handshake, text: t("allClientRecords") } },
      { key: "active", title: t("activeClients"), value: count(ClientStatus.ACTIVE), valueClassName: "text-success-foreground", footer: { icon: CheckCircle, text: t("currentlyBilled") } },
      { key: "leads", title: t("leads"), value: count(ClientStatus.LEAD), valueClassName: "text-info-foreground", footer: { icon: Sparkles, text: t("notYetSigned") } },
      { key: "contacts", title: t("contacts"), value: contacts, valueClassName: "text-primary", footer: { icon: Users, text: t("peopleAtClients") } },
    ]
  }, [clients, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader />
      <MetricCardGrid cards={cards} isLoading={isLoading} />

      <DataTable
        title={t("clients")}
        isLoading={isLoading}
        columns={columns}
        data={clients}
        searchColumnId="name"
        searchPlaceholder={t("searchClients")}
        exportFilename="clients"
        actions={
          canCreate
            ? [{ label: t("addClient"), onClick: () => openForm(null), iconOnly: true, icon: Plus, variant: "primary" }]
            : []
        }
        filters={[
          {
            columnId: "status",
            title: t("status"),
            options: Object.values(ClientStatus).map((s) => ({ label: t(CLIENT_STATUS_LABEL[s]), value: s })),
          },
        ]}
      />

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
        <ClientForm
          ref={formRef}
          client={editing ?? undefined}
          employees={employees}
          currency={workspace.currency}
          onValid={handleValid}
        />
      </DataTableEntityFormSheet>

      <ClientProfileSheet
        client={viewing}
        employees={employees}
        currency={workspace.currency}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <ConfirmAlertDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteClient")}
        description={t("deleteClientConfirmation", { name: deleting?.name ?? "" })}
        confirmLabel={t("delete")}
        destructive
        isLoading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  )
}

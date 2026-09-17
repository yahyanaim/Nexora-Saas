"use client"

import { useMemo, useRef, useState } from "react"
import { DataTable } from "../data-table-chunks/data-table"
import { getRolesColumns } from "./roles-columns"
import { RoleForm, RoleFormHandle } from "./role-form"
import {
  createRoleApi,
  updateRoleApi,
  deleteRoleApi,
  toggleRoleStatusApi,
} from "@/lib/api/roles-apis"
import { Role, CreateRolePayload, UpdateRolePayload } from "@/types/roles"
import { useFetchRolesTable } from "@/hooks/roles/use-fetch-roles-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { DataTableEntityFormDialog } from "../data-table-chunks/data-table-entity-form-dialog"
import { useTranslations } from "next-intl"
import { ActivationStatus } from "@/types/users"
import { Plus } from "@/components/ui/carbon/icons"

type PendingAction =
  | { type: "delete"; role: Role }
  | { type: "deactivate"; role: Role }
  | { type: "activate"; role: Role }
  | null

export default function RolesPage() {
  const t = useTranslations()

  const {
    items: roles,
    pageCount,
    totalItems,
    isLoading,
    isFetching,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh,
  } = useFetchRolesTable()

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "roles",
      createFn: createRoleApi,
      updateFn: updateRoleApi,
      deleteFn: deleteRoleApi,
      entityLabel: "Role",
    })

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const formRef = useRef<RoleFormHandle>(null)

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingRole(null)
    setFormOpen(true)
  }

  function openEditForm(role: Role) {
    setFormMode("edit")
    setEditingRole(role)
    setFormOpen(true)
  }

  function handleFormValid(values: CreateRolePayload | UpdateRolePayload) {
    if (formMode === "create") {
      create(values as CreateRolePayload, { onSuccess: () => setFormOpen(false) })
    } else if (editingRole) {
      update(editingRole.id, values)
      setFormOpen(false)
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.role.id, {
        onSuccess: () => setPendingAction(null),
      })
      return
    }

    // Activate/Deactivate go through a dedicated status toggle, so we
    // handle their loading state locally, same as ban/activate for users
    setIsStatusLoading(true)
    try {
      const nextStatus =
        pendingAction.type === "deactivate"
          ? ActivationStatus.INACTIVE
          : ActivationStatus.ACTIVE

      await toggleRoleStatusApi(pendingAction.role.id, nextStatus)
      refresh()
      setPendingAction(null)
    } finally {
      setIsStatusLoading(false)
    }
  }

  const columns = useMemo(
    () =>
      getRolesColumns(
        {
          onEdit: openEditForm,
          onDeactivate: (role) =>
            setPendingAction({ type: "deactivate", role }),
          onActivate: (role) => setPendingAction({ type: "activate", role }),
          onDelete: (role) => setPendingAction({ type: "delete", role }),
        },
        t
      ),
    [t]
  )

  // Dialog copy per action type, kept in one place
  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.role.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteRoleTitle"),
          description: t("deleteRoleConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting,
        }
      case "deactivate":
        return {
          title: t("deactivateRoleTitle"),
          description: t("deactivateRoleConfirmation", { name }),
          confirmLabel: t("deactivate"),
          destructive: true,
          isLoading: isStatusLoading,
        }
      case "activate":
        return {
          title: t("activateRoleTitle"),
          description: t("activateRoleConfirmation", { name }),
          confirmLabel: t("activate"),
          destructive: false,
          isLoading: isStatusLoading,
        }
    }
  }, [pendingAction, isDeleting, isStatusLoading, t])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <DataTable
        manual
        title={t("roles")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={roles}
        rowCount={totalItems}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("searchRoles")}
        actions={[
          {
            label: t("create"),
            onClick: () => openCreateForm(),
            iconOnly: true,
            icon: Plus,
            variant: "primary",
          },
        ]}
        filters={[
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("active"), value: ActivationStatus.ACTIVE },
              { label: t("inactive"), value: ActivationStatus.INACTIVE },
            ],
          },
        ]}
      />
      <DataTableEntityFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("addRole")}
        style={{ maxWidth: "600px" }}
        editTitle={t("editRole")}
        description={
          formMode === "create" ? t("createNewRole") : t("updateRoleDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <RoleForm
          ref={formRef}
          mode={formMode}
          defaultValues={editingRole ?? undefined}
          onValid={handleFormValid}
        />
      </DataTableEntityFormDialog>

      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}

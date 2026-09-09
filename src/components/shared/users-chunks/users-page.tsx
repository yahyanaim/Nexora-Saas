"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "../data-table-chunks/data-table"
import { getUsersColumns } from "./users-columns"
import { UserForm, UserFormHandle } from "./user-form"
import {
  createUserApi,
  updateUserApi,
  deleteUserApi,
  toggleBanUserApi,
} from "@/lib/api/users-apis"
import { User, UserStatus, UserType } from "@/types/users"
import { useUsersTable } from "@/hooks/users/use-users-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { DataTableEntityFormSheet } from "../data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"
import { Plus } from "lucide-react"

type PendingAction =
  | { type: "delete"; user: User }
  | { type: "ban"; user: User }
  | { type: "activate"; user: User }
  | null

export default function UsersPage() {
  const t = useTranslations()
  const router = useRouter()

  const {
    items: users,
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
  } = useUsersTable({
    defaultFilters: [
      {
        field: "userType",
        operator: "eq",
        value: UserType.USER,
      },
    ],
  })

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "users",
      createFn: createUserApi,
      updateFn: updateUserApi,
      deleteFn: deleteUserApi,
      entityLabel: "User",
    })

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const formRef = useRef<UserFormHandle>(null)

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isBanLoading, setIsBanLoading] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingUser(null)
    setFormOpen(true)
  }

  function openEditForm(user: User) {
    setFormMode("edit")
    setEditingUser(user)
    setFormOpen(true)
  }

  function handleFormValid(values: any) {
    if (formMode === "create") {
      create(values, { onSuccess: () => setFormOpen(false) })
    } else if (editingUser) {
      update(editingUser.id, values)
      setFormOpen(false)
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.user.id, {
        onSuccess: () => setPendingAction(null),
      })
      return
    }

    setIsBanLoading(true)
    try {
      if (pendingAction.type === "ban") {
        await toggleBanUserApi(pendingAction.user.id, true)
      } else if (pendingAction.type === "activate") {
        await toggleBanUserApi(pendingAction.user.id, false)
      }
      refresh()
      setPendingAction(null)
    } finally {
      setIsBanLoading(false)
    }
  }

  const columns = useMemo(
    () =>
      getUsersColumns(
        {
          onView: (user) => router.push(`/users/${user.id}`),
          onEdit: openEditForm,
          onSuspend: (user) => setPendingAction({ type: "ban", user }),
          onActivate: (user) => setPendingAction({ type: "activate", user }),
          onDelete: (user) => setPendingAction({ type: "delete", user }),
        },
        t
      ),
    [router, t]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.user.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteUser"),
          description: t("deleteUserConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting,
        }
      case "ban":
        return {
          title: t("banUser"),
          description: t("banUserConfirmation", { name }),
          confirmLabel: t("ban"),
          destructive: true,
          isLoading: isBanLoading,
        }
      case "activate":
        return {
          title: t("reactivateUser"),
          description: t("reactivateUserConfirmation", { name }),
          confirmLabel: t("reactivate"),
          destructive: false,
          isLoading: isBanLoading,
        }
    }
  }, [pendingAction, isDeleting, isBanLoading, t])

  return (
    <>
      <DataTable
        manual
        title={t("users")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={users}
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
        searchPlaceholder={t("searchByNameEmailUsername")}
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
              { label: t("active"), value: UserStatus.ACTIVE },
              { label: t("inactive"), value: UserStatus.INACTIVE },
              { label: t("notVerified"), value: UserStatus.NOT_VERIFIED },
              { label: t("banned"), value: UserStatus.BANNED },
            ],
          },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("addUser")}
        editTitle={t("editUser")}
        description={
          formMode === "create"
            ? t("createNewAccount")
            : t("updateAccountDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <UserForm
          ref={formRef}
          mode={formMode}
          defaultValues={editingUser ?? undefined}
          onValid={handleFormValid}
        />
      </DataTableEntityFormSheet>

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
    </>
  )
}

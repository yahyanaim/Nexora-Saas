"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "../data-table-chunks/data-table"
import { getBannedUsersColumns } from "./banned-users-columns"
import { toggleBanUserApi } from "@/lib/api/users-apis"
import { User } from "@/types/users"
import { useUsersTable } from "@/hooks/users/use-users-table"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"

type PendingAction =
  | { type: "delete"; user: User }
  | { type: "ban"; user: User }
  | { type: "activate"; user: User }
  | null

export default function BannedUsersPage() {
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
        field: "status",
        operator: "eq",
        value: "banned",
      },
    ],
  })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isBanLoading, setIsBanLoading] = useState(false)

  async function handleConfirm() {
    if (!pendingAction) return

    setIsBanLoading(true)
    try {
      if (pendingAction.type === "activate") {
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
      getBannedUsersColumns(
        {
          onActivate: (user) => setPendingAction({ type: "activate", user }),
        },
        t
      ),
    [router]
  )

  // Dialog copy per action type, kept in one place
  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.user.name

    switch (pendingAction.type) {
      case "activate":
        return {
          title: t("unbanUser"),
          description: t("unbanUserConfirmation", { name }),
          confirmLabel: t("unban"),
          destructive: false,
          isLoading: isBanLoading,
        }
    }
  }, [pendingAction, isBanLoading, t])

  return (
    <>
      <DataTable
        manual
        title={t("banned")}
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
      />

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

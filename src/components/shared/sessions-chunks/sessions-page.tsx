// app/sessions/page.tsx

"use client"

import { useMemo, useState } from "react"
import { Session, SessionStatus } from "@/types/sessions"
import { DataTable } from "../data-table-chunks/data-table"
import { useFetchSessionsTable } from "@/hooks/sessions/use-fetch-sessions-table"
import { getSessionsColumns } from "./sessions-columns"
import {
  activeSessionApi,
  deleteSessionApi,
  inactiveSessionApi,
} from "@/lib/api/sessions-apis"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { useLocale, useTranslations } from "next-intl"
import { useQueryClient } from "@tanstack/react-query"

type PendingAction =
  | { type: "activate"; session: Session }
  | { type: "inactive"; session: Session }
  | { type: "delete"; session: Session }
  | null

export default function SessionsPage() {
  const queryClient = useQueryClient()
  const t = useTranslations()
  const locale = useLocale()
  const {
    items,
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
  } = useFetchSessionsTable()

  const { isDeleting, remove } = useEntityMutations({
    queryKey: "sessions",
    entityLabel: "Session",
    deleteFn: deleteSessionApi,
    createFn: async () => {
      throw new Error("Create not supported from SessionsPage")
    },
    updateFn: async () => {
      throw new Error("Update not supported from SessionsPage")
    },
  })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(false)

  async function handleConfirm() {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.session.id, {
        onSuccess: () => setPendingAction(null),
      })
      return
    }

    setIsStatusLoading(true)
    try {
      if (pendingAction.type === "activate") {
        await activeSessionApi(pendingAction.session.id)
      } else if (pendingAction.type === "inactive") {
        await inactiveSessionApi(pendingAction.session.id)
      }
      await queryClient.invalidateQueries({ queryKey: ["sessions"] })
      setPendingAction(null)
    } finally {
      setIsStatusLoading(false)
    }
  }

  const columns = useMemo(
    () =>
      getSessionsColumns(
        {
          onActivate: (session) =>
            setPendingAction({ type: "activate", session }),
          onDeactivate: (session) =>
            setPendingAction({ type: "inactive", session }),
          onDelete: (session) => setPendingAction({ type: "delete", session }),
        },
        t,
        locale
      ),
    [t, locale]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const user = pendingAction.session.user?.name ?? t("unknown")

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteSessionTitle"),
          description: t("deleteSessionConfirmation", { user }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting,
        }
      case "inactive":
        return {
          title: t("inactiveSessionTitle"),
          description: t("inactiveSessionConfirmation", { user }),
          confirmLabel: t("inactive"),
          destructive: true,
          isLoading: isStatusLoading,
        }
      case "activate":
        return {
          title: t("activateSessionTitle"),
          description: t("activateSessionConfirmation", { user }),
          confirmLabel: t("activate"),
          destructive: false,
          isLoading: isStatusLoading,
        }
    }
  }, [pendingAction, isDeleting, isStatusLoading, t])

  return (
    <>
      <DataTable
        manual
        title={t("sessions")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={items}
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
        searchPlaceholder={t("searchByUserIPDevice")}
        filters={[
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("active"), value: SessionStatus.ACTIVE },
              { label: t("inactive"), value: SessionStatus.INACTIVE },
              { label: t("expired"), value: SessionStatus.EXPIRED },
            ],
          },
        ]}
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

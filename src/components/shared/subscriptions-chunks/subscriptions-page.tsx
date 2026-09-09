"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { getSubscriptionsColumns } from "./subscriptions-columns"
import {
  createSubscriptionApi,
  updateSubscriptionApi,
  deleteSubscriptionApi,
  cancelSubscriptionApi,
} from "@/lib/api/subscriptions-api"
import { Subscription, SubscriptionStatus } from "@/types/subscriptions"
import { useSubscriptionsTable } from "@/hooks/subscriptions/use-subscriptions-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { useTranslations } from "next-intl"
import { SubscriptionForm, SubscriptionFormHandle } from "./subscription-form"
import { Plus } from "lucide-react"
import { SubscriptionsSummaryCards } from "./subscriptions-summary-cards"

type PendingAction =
  | { type: "delete"; subscription: Subscription }
  | { type: "cancel"; subscription: Subscription }
  | null

export default function SubscriptionsPage() {
  const t = useTranslations()
  const router = useRouter()

  const {
    items: subscriptions,
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
  } = useSubscriptionsTable()

  const { create, isCreating, update, isUpdating, remove, isDeleting } =
    useEntityMutations({
      queryKey: "subscriptions",
      createFn: createSubscriptionApi,
      updateFn: updateSubscriptionApi,
      deleteFn: deleteSubscriptionApi,
      entityLabel: "Subscription",
    })

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingSubscription, setEditingSubscription] =
    useState<Subscription | null>(null)
  const formRef = useRef<SubscriptionFormHandle>(null)

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [isCanceling, setIsCanceling] = useState(false)

  function openCreateForm() {
    setFormMode("create")
    setEditingSubscription(null)
    setFormOpen(true)
  }

  function openEditForm(subscription: Subscription) {
    setFormMode("edit")
    setEditingSubscription(subscription)
    setFormOpen(true)
  }

  function handleFormValid(values: any) {
    if (formMode === "create") {
      create(values, { onSuccess: () => setFormOpen(false) })
    } else if (editingSubscription) {
      update(editingSubscription.id, values)
      setFormOpen(false)
    }
  }

  async function handleConfirm() {
    if (!pendingAction) return

    if (pendingAction.type === "delete") {
      remove(pendingAction.subscription.id, {
        onSuccess: () => setPendingAction(null),
      })
      return
    }

    setIsCanceling(true)
    try {
      await cancelSubscriptionApi(pendingAction.subscription.id)
      refresh()
      setPendingAction(null)
    } finally {
      setIsCanceling(false)
    }
  }

  const columns = useMemo(
    () =>
      getSubscriptionsColumns(
        {
          onViewUser: (sub) => router.push(`/users/${sub.user?.id ?? ""}`),
          onEdit: openEditForm,
          onDelete: (sub) =>
            setPendingAction({ type: "delete", subscription: sub }),
          onCancel: (sub) =>
            setPendingAction({ type: "cancel", subscription: sub }),
        },
        t
      ),
    [router, t]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name =
      pendingAction.subscription.user?.name ?? pendingAction.subscription.name

    switch (pendingAction.type) {
      case "delete":
        return {
          title: t("deleteSubscription"),
          description: t("deleteSubscriptionConfirmation", { name }),
          confirmLabel: t("delete"),
          destructive: true,
          isLoading: isDeleting,
        }
      case "cancel":
        return {
          title: t("cancelSubscription"),
          description: t("cancelSubscriptionConfirmation", { name }),
          confirmLabel: t("cancel"),
          destructive: true,
          isLoading: isCanceling,
        }
    }
  }, [pendingAction, isDeleting, isCanceling, t])

  const getDefaultValues = (subscription: Subscription | null) => {
    if (!subscription) return undefined

    return {
      name: subscription.name,
      description: subscription.description || "",
      price: subscription.price,
      period: subscription.period,
      status: subscription.status,
      features: subscription.features,
      user:
        typeof subscription.user === "string"
          ? subscription.user
          : subscription.user?.id || "",
      plan:
        typeof subscription.plan === "string"
          ? subscription.plan
          : subscription.plan?.id || "",
    }
  }

  return (
    <>
      <SubscriptionsSummaryCards subscriptions={subscriptions} />
      <DataTable
        manual
        title={t("subscriptions")}
        isLoading={isLoading}
        isFetching={isFetching}
        columns={columns}
        data={subscriptions}
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
        searchPlaceholder={t("searchByUserOrPlan")}
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
            columnId: "planName",
            title: t("plan"),
            options: [
              { label: t("pro"), value: "Pro" },
              { label: t("enterprise"), value: "Enterprise" },
              { label: t("free"), value: "Free" },
            ],
          },
          {
            columnId: "status",
            title: t("status"),
            options: [
              { label: t("active"), value: SubscriptionStatus.ACTIVE },
              { label: t("inactive"), value: SubscriptionStatus.INACTIVE },
              { label: t("canceled"), value: SubscriptionStatus.CANCELED },
              { label: t("expired"), value: SubscriptionStatus.EXPIRED },
              { label: t("pastDue"), value: SubscriptionStatus.PAST_DUE },
            ],
          },
          {
            columnId: "billingCycle",
            title: t("billingCycle"),
            options: [
              { label: t("monthly"), value: "monthly" },
              { label: t("yearly"), value: "yearly" },
            ],
          },
        ]}
      />

      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("addSubscription")}
        editTitle={t("editSubscription")}
        description={
          formMode === "create"
            ? t("createNewSubscription")
            : t("updateSubscriptionDetails")
        }
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <SubscriptionForm
          ref={formRef}
          mode={formMode}
          defaultValues={getDefaultValues(editingSubscription)}
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

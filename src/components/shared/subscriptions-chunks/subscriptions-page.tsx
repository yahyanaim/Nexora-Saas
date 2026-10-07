"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/shared/data-table-chunks/data-table"
import { DataTableEntityFormSheet } from "@/components/shared/data-table-chunks/data-table-entity-form-sheet"
import { ConfirmAlertDialog } from "@/components/ui/confirm-alert-dialog"
import { billingApi, createPortalApi } from "@/lib/api/billing-apis"
import {
  createSubscriptionApi,
  updateSubscriptionApi,
  deleteSubscriptionApi,
  cancelSubscriptionApi,
} from "@/lib/api/subscriptions-api"
import { useSubscriptionsTable } from "@/hooks/subscriptions/use-subscriptions-table"
import { useEntityMutations } from "@/hooks/tables/use-table-entity-mutations"
import { apiErrorMessage } from "@/lib/myapi/client"
import { toast } from "@/lib/utils/toast"
import { InlineNotification, ActionableNotification } from "@/components/ui/carbon/notification"
import { SubscriptionsSummaryCards } from "./subscriptions-summary-cards"
import { getSubscriptionsColumns } from "./subscriptions-columns"
import { SubscriptionForm, SubscriptionFormHandle } from "./subscription-form"
import {
  Subscription,
  SubscriptionStatus,
  CreateSubscriptionPayload,
} from "@/types/subscriptions"
import { PageHeader } from "@/components/shared/page-header"

type PendingAction =
  | { type: "delete"; subscription: Subscription }
  | { type: "cancel"; subscription: Subscription }
  | null

export default function SubscriptionsPage() {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [billingNotice, setBillingNotice] = useState<string | null>(null)

  // Workspace subscription query
  const {
    data: subscription,
    isLoading: isBillingLoading,
    isError,
  } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: billingApi.getSubscription,
    retry: false,
  })

  // Table queries & mutations for Customer Subscriptions Directory
  const {
    items: subscriptions,
    pageCount,
    totalItems,
    isLoading: isTableLoading,
    isFetching: isTableFetching,
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
    useEntityMutations<Subscription, CreateSubscriptionPayload, Partial<CreateSubscriptionPayload>>({
      queryKey: "subscriptions",
      createFn: createSubscriptionApi,
      updateFn: updateSubscriptionApi,
      deleteFn: deleteSubscriptionApi,
      entityLabel: "Subscription",
    })

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelSubscriptionApi(id),
    onSuccess: () => {
      toast.success(t("cancelSubscription") || "Subscription canceled successfully")
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] })
      queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
      refresh()
    },
    onError: (err: unknown) => {
      toast.error(apiErrorMessage(err, "Failed to cancel subscription"))
    },
  })

  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<"create" | "edit">("create")
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null)
  const formRef = useRef<SubscriptionFormHandle>(null)

  function openCreateForm() {
    setFormMode("create")
    setEditingSubscription(null)
    setFormOpen(true)
  }

  function openEditForm(sub: Subscription) {
    setFormMode("edit")
    setEditingSubscription(sub)
    setFormOpen(true)
  }

  function handleFormValid(values: CreateSubscriptionPayload) {
    if (formMode === "create") {
      create(values, {
        onSuccess: () => {
          setFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
          refresh()
        },
      })
    } else if (editingSubscription) {
      update(editingSubscription.id, values, {
        onSuccess: () => {
          setFormOpen(false)
          queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
          refresh()
        },
      })
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return
    if (pendingAction.type === "delete") {
      remove(pendingAction.subscription.id, {
        onSuccess: () => {
          setPendingAction(null)
          queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
          refresh()
        },
      })
    } else if (pendingAction.type === "cancel") {
      cancelMutation.mutate(pendingAction.subscription.id, {
        onSuccess: () => {
          setPendingAction(null)
        },
      })
    }
  }

  const columns = useMemo(
    () =>
      getSubscriptionsColumns(
        {
          onViewUser: () => router.push("/dashboard/users"),
          onEdit: openEditForm,
          onDelete: (sub) => setPendingAction({ type: "delete", subscription: sub }),
          onCancel: (sub) => setPendingAction({ type: "cancel", subscription: sub }),
          onActivate: (sub) => {
            update(
              sub.id,
              { status: SubscriptionStatus.ACTIVE },
              {
                onSuccess: () => {
                  toast.success("Subscription activated")
                  queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
                  refresh()
                },
              }
            )
          },
          onRenew: (sub) => {
            update(
              sub.id,
              { status: SubscriptionStatus.ACTIVE },
              {
                onSuccess: () => {
                  toast.success("Subscription renewed")
                  queryClient.invalidateQueries({ queryKey: ["subscriptions-summary"] })
                  refresh()
                },
              }
            )
          },
        },
        t
      ),
    [t, router, update, queryClient, refresh]
  )

  const confirmConfig = useMemo(() => {
    if (!pendingAction) return null
    const name = pendingAction.subscription.user?.name ?? pendingAction.subscription.name

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
          isLoading: cancelMutation.isPending,
        }
      default:
        return null
    }
  }, [pendingAction, isDeleting, cancelMutation.isPending, t])

  const defaultFormValues = useMemo<Partial<CreateSubscriptionPayload> | undefined>(() => {
    if (!editingSubscription) return undefined
    return {
      name: editingSubscription.name,
      description: editingSubscription.description,
      price: editingSubscription.price,
      period: editingSubscription.period,
      status: editingSubscription.status,
      features: editingSubscription.features,
      user: editingSubscription.user?.id,
      plan: editingSubscription.plan?.id,
    }
  }, [editingSubscription])

  const statusFilterOptions = useMemo(
    () => [
      { label: t("active") || "Active", value: SubscriptionStatus.ACTIVE },
      { label: t("pastDue") || "Past Due", value: SubscriptionStatus.PAST_DUE },
      { label: t("canceled") || "Canceled", value: SubscriptionStatus.CANCELED },
      { label: t("expired") || "Expired", value: SubscriptionStatus.EXPIRED },
      { label: t("inactive") || "Inactive", value: SubscriptionStatus.INACTIVE },
    ],
    [t]
  )

  const status = subscription?.status ?? "active"
  const isPastDue = status === "past_due"
  const hasAccess = subscription?.access ?? true

  const [now] = useState(() => Date.now())

  // Dunning calculation
  const dunningDaysRemaining = useMemo(() => {
    if (!isPastDue || !subscription?.graceUntil) return null
    const diffMs = new Date(subscription.graceUntil).getTime() - now
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }, [isPastDue, subscription?.graceUntil, now])

  const handleManageBilling = async () => {
    try {
      const { url } = await createPortalApi()
      if (url && url.startsWith("http")) {
        window.location.assign(url)
      } else {
        toast.info("Stripe Customer Portal simulated in demo mode.")
      }
    } catch (err: unknown) {
      const res = err as { response?: { status?: number; data?: { code?: string } } }
      if (
        res?.response?.status === 501 ||
        res?.response?.data?.code === "billing_not_configured"
      ) {
        const msg = "Billing is not configured in this environment (Stripe keys not set)."
        setBillingNotice(msg)
        toast.info(msg)
      } else if (
        res?.response?.status === 400 &&
        res?.response?.data?.code === "no_customer"
      ) {
        toast.error("No billing profile found yet. Please subscribe to a plan first.")
      } else {
        toast.error(apiErrorMessage(err, "Failed to open billing portal."))
      }
    } finally {
    }
  }

  if (isBillingLoading && !subscription) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-4 md:p-6">
      <PageHeader
        actions={
          <>
            <Button
              variant="primary"
              onClick={openCreateForm}
              className="gap-2 shadow-xs"
            >
              <Plus className="size-4" />
              <span>{t("create") || "New Subscription"}</span>
            </Button>
          </>
        }
      />

      {/* Subscription Service Unavailable Banner (only if real fatal error) */}
      {isError && !subscription && (
        <InlineNotification
          kind="error"
          title="Subscription Data Unavailable"
          subtitle="Unable to connect to the billing service. Subscription status cannot be refreshed."
          lowContrast
          hideCloseButton
          className="w-full mb-2"
        />
      )}

      {/* 501 Billing Not Configured Banner */}
      {billingNotice && (
        <InlineNotification
          kind="info"
          title="Billing Not Configured"
          subtitle={billingNotice}
          lowContrast
          onCloseButtonClick={() => setBillingNotice(null)}
          className="w-full mb-2"
        />
      )}

      {/* Dunning Grace Banner */}
      {isPastDue && (
        <ActionableNotification
          kind={hasAccess ? "warning" : "error"}
          title={
            hasAccess
              ? "Payment Past Due — Grace Period Active"
              : "Grace Period Expired — Access Suspended"
          }
          subtitle={
            hasAccess
              ? `Your recent payment failed. You have ${
                  dunningDaysRemaining ?? 7
                } days remaining in your dunning grace period before workspace features are locked.`
              : "Your 7-day grace period has expired. Account access is now locked. Please update your payment method to regain full access."
          }
          actionButtonLabel="Update Payment Method"
          onActionButtonClick={handleManageBilling}
          lowContrast
          hideCloseButton
          className="w-full mb-2"
        />
      )}

      {/* All companies' Nexora subscriptions */}
              <div className="space-y-6 pt-2">
                <SubscriptionsSummaryCards subscriptions={subscriptions} />

                <DataTable
                  manual
                  title={t("subscriptions")}
                  isLoading={isTableLoading}
                  isFetching={isTableFetching}
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
                      label: t("create") || "New Subscription",
                      onClick: openCreateForm,
                      iconOnly: true,
                      icon: Plus,
                      variant: "primary",
                    },
                  ]}
                  filters={[
                    {
                      columnId: "status",
                      title: t("status") || "Status",
                      options: statusFilterOptions,
                    },
                  ]}
                />
              </div>


      {/* Create / Edit Subscription Drawer */}
      <DataTableEntityFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        createTitle={t("create") || "New Subscription"}
        editTitle={t("edit") || "Edit Subscription"}
        description="Configure subscription billing cycle, tier features, and assigned account."
        isSubmitting={isCreating || isUpdating}
        onSubmit={() => formRef.current?.submit()}
      >
        <SubscriptionForm
          ref={formRef}
          mode={formMode}
          defaultValues={defaultFormValues}
          onValid={handleFormValid}
        />
      </DataTableEntityFormSheet>

      {/* Confirmation Alert Dialog */}
      {confirmConfig && (
        <ConfirmAlertDialog
          open={!!pendingAction}
          onOpenChange={(open) => !open && setPendingAction(null)}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
          isLoading={confirmConfig.isLoading}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}

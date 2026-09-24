"use client"

import { useState, useMemo, useRef } from "react"
import { useRouter } from "@/i18n/navigation"
import { useTranslations } from "next-intl"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  Purchase,
  Security,
  ArrowUpRight,
  Launch,
  Renew,
  Calendar,
  CheckmarkFilled,
} from "@carbon/icons-react"
import { Plus } from "@/components/ui/carbon/icons"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs } from "@/components/ui/tabs"
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
import { UsageMeteringCard } from "./usage-metering-card"
import { SubscriptionsSummaryCards } from "./subscriptions-summary-cards"
import { getSubscriptionsColumns } from "./subscriptions-columns"
import { SubscriptionForm, SubscriptionFormHandle } from "./subscription-form"
import {
  Subscription,
  SubscriptionStatus,
  CreateSubscriptionPayload,
} from "@/types/subscriptions"

type PendingAction =
  | { type: "delete"; subscription: Subscription }
  | { type: "cancel"; subscription: Subscription }
  | null

export default function SubscriptionsPage() {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("workspace")
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
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

  const currentPlan = (subscription?.plan ?? "free").toUpperCase()
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
    setIsOpeningPortal(true)
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
      setIsOpeningPortal(false)
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
    <div className="h-full w-full space-y-6 overflow-auto p-4 pb-24 md:p-6 md:pb-28">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            {t("subscriptions")}
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage workspace subscription tiers, resource quotas, and customer billing accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "directory" ? (
            <Button
              variant="primary"
              onClick={openCreateForm}
              className="gap-2 shadow-xs"
            >
              <Plus className="size-4" />
              <span>{t("create") || "New Subscription"}</span>
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/plans")}
                className="gap-2"
              >
                <span>Change Plan</span>
                <ArrowUpRight className="size-4" />
              </Button>
              <Button
                variant="primary"
                onClick={handleManageBilling}
                disabled={isOpeningPortal}
                className="gap-2 shadow-xs"
              >
                {isOpeningPortal ? (
                  <Renew className="size-4 animate-spin" />
                ) : (
                  <Purchase className="size-4" />
                )}
                <span>Manage Subscription</span>
              </Button>
            </>
          )}
        </div>
      </div>

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

      {/* Primary Content Tabs */}
      <Tabs
        defaultTabId="workspace"
        onChange={(tab) => setActiveTab(tab.id)}
        tabs={[
          {
            id: "workspace",
            label: "Workspace & Quotas",
            icon: <Security className="size-4" />,
            content: (
              <div className="space-y-6 pt-2">
                {/* Current Plan Overview Card */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardDescription>Current Workspace Tier</CardDescription>
                          <CardTitle className="text-2xl font-bold flex items-center gap-3 mt-1">
                            <span>{currentPlan} Plan</span>
                            <Badge
                              variant={status === "active" ? "outline" : "destructive"}
                              className={
                                status === "active"
                                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 capitalize"
                                  : "border-red-500/30 bg-red-500/15 text-red-700 dark:text-red-300 capitalize font-semibold"
                              }
                            >
                              {status}
                            </Badge>
                          </CardTitle>
                        </div>
                        <Security className="size-8 text-primary opacity-80" />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {currentPlan === "ENTERPRISE"
                          ? "Your workspace is on the Enterprise tier with unlimited scale and dedicated SLA."
                          : currentPlan === "PRO"
                          ? "Your workspace is on the Pro tier with power tools, priority support, and higher limits."
                          : "Your workspace is currently on the Free tier. Upgrade at any time for advanced features."}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <Calendar className="size-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Renewal Date</div>
                            <div className="text-sm font-medium">
                              {subscription?.currentPeriodEnd
                                ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                                : "No active renewal"}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 rounded-lg border p-3">
                          <Purchase className="size-4 text-muted-foreground" />
                          <div>
                            <div className="text-xs text-muted-foreground">Payment Method</div>
                            <div className="text-sm font-medium">
                              {subscription?.hasPaymentMethod
                                ? "Card on file (Stripe)"
                                : "None configured"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex items-center justify-between border-t pt-4">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckmarkFilled className="size-4 text-emerald-600" />
                        <span>
                          {hasAccess
                            ? "All plan features active and accessible"
                            : "Access temporarily suspended"}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleManageBilling}
                        disabled={isOpeningPortal}
                        className="gap-1.5"
                      >
                        <span>Stripe Portal</span>
                        <Launch className="size-3.5" />
                      </Button>
                    </CardFooter>
                  </Card>

                  {/* Quick Upgrade Callout */}
                  <Card className="flex flex-col justify-between">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Need More Power?</CardTitle>
                      <CardDescription>
                        Explore plans to unlock higher rate limits, full API access, and team collaboration.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckmarkFilled className="size-4 text-primary" />
                        <span>Priority Support & SLA</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckmarkFilled className="size-4 text-primary" />
                        <span>Full API & Webhooks Access</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckmarkFilled className="size-4 text-primary" />
                        <span>Audit Logging & Analytics</span>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={() => router.push("/dashboard/plans")}
                      >
                        View All Plans
                      </Button>
                    </CardFooter>
                  </Card>
                </div>

                {/* Real-time Quota & Usage Metering */}
                <UsageMeteringCard />
              </div>
            ),
          },
          {
            id: "directory",
            label: "All Subscriptions",
            icon: <Purchase className="size-4" />,
            content: (
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
            ),
          },
        ]}
      />

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

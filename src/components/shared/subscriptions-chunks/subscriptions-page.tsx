"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import {
  Purchase,
  Security,
  ArrowUpRight,
  Launch,
  Renew,
  Calendar,
  CheckmarkFilled,
} from "@carbon/icons-react"
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
import { billingApi, createPortalApi } from "@/lib/api/billing-apis"
import { apiErrorMessage } from "@/lib/myapi/client"
import { toast } from "@/lib/utils/toast"
import { InlineNotification, ActionableNotification } from "@/components/ui/carbon/notification"
import { UsageMeteringCard } from "./usage-metering-card"

export default function SubscriptionsPage() {
  const t = useTranslations()
  const router = useRouter()
  const [isOpeningPortal, setIsOpeningPortal] = useState(false)
  const [billingNotice, setBillingNotice] = useState<string | null>(null)

  const {
    data: subscription,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["billing-subscription"],
    queryFn: billingApi.getSubscription,
    retry: false,
  })

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
      if (url) {
        window.location.assign(url)
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

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
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
            Manage your workspace subscription, billing details, and payment method.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push("/dashboard/plans")}
            className="gap-2"
          >
            Change Plan
            <ArrowUpRight className="size-4" />
          </Button>
          <Button
            variant="primary"
            onClick={handleManageBilling}
            disabled={isOpeningPortal}
            className="gap-2"
          >
            {isOpeningPortal ? (
              <Renew className="size-4 animate-spin" />
            ) : (
              <Purchase className="size-4" />
            )}
            Manage Subscription
          </Button>
        </div>
      </div>

      {/* Subscription Service Unavailable Banner */}
      {isError && (
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
      <UsageMeteringCard className="mt-6" />
    </div>
  )
}

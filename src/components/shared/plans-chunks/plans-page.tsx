"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useQuery } from "@tanstack/react-query"
import { Purchase, Renew } from "@carbon/icons-react"
import { Button } from "@/components/ui/button"
import { FooterGradient } from "@/components/ui/footer-gradient"
import { PlanCard, PlanCardData } from "./plan-card"
import { billingApi, createCheckoutApi, createPortalApi } from "@/lib/api/billing-apis"
import { apiErrorMessage } from "@/lib/myapi/client"
import { toast } from "@/lib/utils/toast"
import { InlineNotification, ActionableNotification } from "@/components/ui/carbon/notification"

const TIERS: PlanCardData[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "month",
    description: "Essential tools for personal projects and exploring the platform.",
    featured: false,
    features: [
      "1 Workspace",
      "Up to 3 team members",
      "Community support",
      "Basic analytics",
      "Standard rate limits",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    period: "month",
    description: "Advanced features and power tools for scaling businesses.",
    featured: true,
    features: [
      "Unlimited workspaces",
      "Up to 25 team members",
      "Priority email support",
      "Advanced analytics & audit logs",
      "Higher API rate limits",
      "Full API & Webhook access",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$99",
    period: "month",
    description: "Maximum security, scalability, and dedicated assistance.",
    featured: false,
    features: [
      "Unlimited seats & usage",
      "Dedicated account manager",
      "99.99% uptime SLA",
      "Custom integrations & webhooks",
      "SSO / SAML authentication",
      "Custom billing & invoicing",
    ],
  },
]

export default function PlansPage() {
  const t = useTranslations()
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null)
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

  const currentPlan = subscription?.plan ?? "free"
  const isPastDue = subscription?.status === "past_due"
  const hasAccess = subscription?.access ?? true

  const [now] = useState(() => Date.now())

  // Dunning grace remaining calculation
  const dunningDaysRemaining = useMemo(() => {
    if (!isPastDue || !subscription?.graceUntil) return null
    const diffMs = new Date(subscription.graceUntil).getTime() - now
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))
  }, [isPastDue, subscription?.graceUntil, now])

  const handleUpgrade = async (plan: PlanCardData) => {
    if (plan.id !== "pro" && plan.id !== "enterprise") return
    setUpgradingPlan(plan.id)
    try {
      const { url } = await createCheckoutApi(plan.id)
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
      } else {
        toast.error(apiErrorMessage(err, "Failed to initiate checkout."))
      }
    } finally {
      setUpgradingPlan(null)
    }
  }

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
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full w-full space-y-6 overflow-auto p-4 pb-24 md:p-6 md:pb-28">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              {t("plans")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("plansDescription")}
            </p>
          </div>
          {subscription?.hasPaymentMethod && (
            <Button
              variant="outline"
              onClick={handleManageBilling}
              disabled={isOpeningPortal}
              className="gap-2"
            >
              {isOpeningPortal ? (
                <Renew className="size-4 animate-spin" />
              ) : (
                <Purchase className="size-4" />
              )}
              Manage Billing
            </Button>
          )}
        </div>

        {/* Billing Service Unavailable Banner */}
        {isError && (
          <InlineNotification
            kind="error"
            title="Subscription Data Unavailable"
            subtitle="Unable to connect to the billing service. Plan details may be out of date."
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

        {/* Past Due Dunning Banner */}
        {isPastDue && (
          <ActionableNotification
            kind={hasAccess ? "warning" : "error"}
            title={
              hasAccess
                ? "Payment Past Due (Grace Period Active)"
                : "Grace Period Expired — Access Restricted"
            }
            subtitle={
              hasAccess
                ? `Your payment method could not be charged. You have ${
                    dunningDaysRemaining ?? 7
                  } days remaining in your grace period before account features are restricted.`
                : "Your 7-day grace period has expired and premium workspace features have been suspended. Please update your payment method to restore access."
            }
            actionButtonLabel="Update Payment"
            onActionButtonClick={handleManageBilling}
            lowContrast
            hideCloseButton
            className="w-full"
          />
        )}

        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl mx-auto pt-4">
          {TIERS.map((plan, index) => {
            const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase()
            const isUpgradable = plan.id === "pro" || plan.id === "enterprise"

            let actionLabel = "Select Plan"
            if (plan.id === "pro") {
              actionLabel = currentPlan === "enterprise" ? "Downgrade to Pro" : "Upgrade to Pro"
            } else if (plan.id === "enterprise") {
              actionLabel = "Upgrade to Enterprise"
            }

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                isCurrent={isCurrent}
                isUpgrading={upgradingPlan === plan.id}
                actionLabel={actionLabel}
                disabled={!isUpgradable && !isCurrent}
                onUpgrade={isUpgradable && !isCurrent ? () => handleUpgrade(plan) : undefined}
              />
            )
          })}
        </div>
      </div>

      <FooterGradient position="absolute" height="lg" blur={false} />
    </div>
  )
}

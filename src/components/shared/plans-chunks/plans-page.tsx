"use client"

import { useState, useMemo } from "react"
import { useTranslations } from "next-intl"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { CreditCard as Purchase, RefreshCw as Renew, CircleHelp as Help } from "@/components/ui/carbon/icons"
import confetti from "canvas-confetti"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/shared/page-header"
import { PlanCard, PlanCardData } from "./plan-card"
import { billingApi, createCheckoutApi, createPortalApi } from "@/lib/api/billing-apis"
import { apiErrorMessage } from "@/lib/myapi/client"
import { toast } from "@/lib/utils/toast"
import { InlineNotification, ActionableNotification } from "@/components/ui/carbon/notification"
import { cn } from "@/lib/utils"

export default function PlansPage() {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly")
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

  const tiers: PlanCardData[] = useMemo(
    () => [
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
          "Standard rate limits (1k calls/mo)",
        ],
      },
      {
        id: "pro",
        name: "Pro",
        price: billingCycle === "annual" ? "$24" : "$29",
        period: billingCycle === "annual" ? "mo (billed annually)" : "month",
        description: "Advanced features and power tools for scaling businesses.",
        featured: true,
        features: [
          "Unlimited workspaces",
          "Up to 25 team members",
          "Priority email support",
          "Advanced analytics & audit logs",
          "Higher API rate limits (100k calls/mo)",
          "Full API & Webhook access",
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        price: billingCycle === "annual" ? "$79" : "$99",
        period: billingCycle === "annual" ? "mo (billed annually)" : "month",
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
    ],
    [billingCycle]
  )

  const handleUpgrade = async (plan: PlanCardData) => {
    if (plan.id !== "pro" && plan.id !== "enterprise") return
    setUpgradingPlan(plan.id)
    try {
      const { url } = await createCheckoutApi(plan.id)
      if (url && url.startsWith("http")) {
        window.location.assign(url)
      } else {
        // Trigger celebratory confetti in demo mode
        try {
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.7 },
          })
        } catch {
          // ignore confetti error in non-canvas environments
        }
        toast.success(`Upgraded to ${plan.name} Plan! Your workspace features are now active.`)
        queryClient.invalidateQueries({ queryKey: ["billing-subscription"] })
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

  if (isLoading && !subscription) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="w-full space-y-6 p-4 md:p-6">
        <PageHeader
          description={`${t("plansDescription")} Choose the plan that best fits your scaling team.`}
          actions={
            <>
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
            </>
          }
        />

        {/* Billing Service Unavailable Banner (only if real fatal error) */}
        {isError && !subscription && (
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

        {/* Billing Cycle Toggle */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2">
          <div className="inline-flex items-center rounded-full bg-muted p-1" role="group" aria-label="Billing cycle">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={cn(
                "h-9 rounded-full px-4 text-[13px] font-medium transition-all",
                billingCycle === "monthly"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-all",
                billingCycle === "annual"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span>Annual Billing</span>
              <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-semibold text-success-foreground">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-6xl mx-auto">
          {tiers.map((plan, index) => {
            const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase()
            const isUpgradable = plan.id === "pro" || plan.id === "enterprise"

            let actionLabel = "Select Plan"
            if (isCurrent) {
              actionLabel = "Current Plan"
            } else if (plan.id === "pro") {
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
                disabled={!isUpgradable || isCurrent}
                onUpgrade={isUpgradable && !isCurrent ? () => handleUpgrade(plan) : undefined}
              />
            )
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <div className="max-w-6xl mx-auto pt-8">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-panel">
            <h2 className="text-xl font-bold tracking-tight text-foreground mb-4">
              Plan Comparison & Limits
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-4 font-semibold">Capability</th>
                    <th className="py-3 px-4 font-semibold">Free</th>
                    <th className="py-3 px-4 font-semibold text-primary">Pro</th>
                    <th className="py-3 px-4 font-semibold">Enterprise</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Workspaces</td>
                    <td className="py-3.5 px-4 text-muted-foreground">1 Workspace</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">Unlimited</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Unlimited Dedicated</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Team Member Seats</td>
                    <td className="py-3.5 px-4 text-muted-foreground">3 Members</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">Up to 25</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Unlimited Custom</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Cloud Storage</td>
                    <td className="py-3.5 px-4 text-muted-foreground">1 GB</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">10 GB</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Unlimited / Custom S3</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Monthly API Calls</td>
                    <td className="py-3.5 px-4 text-muted-foreground">1,000 req/mo</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">100,000 req/mo</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Unlimited Rate Limits</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Audit Logs & Compliance</td>
                    <td className="py-3.5 px-4 text-muted-foreground">—</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">30-day retention</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Indefinite & SOC2</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">SSO / SAML</td>
                    <td className="py-3.5 px-4 text-muted-foreground">—</td>
                    <td className="py-3.5 px-4 text-muted-foreground">—</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">Okta, Azure, Google</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 px-4 font-medium">Support SLA</td>
                    <td className="py-3.5 px-4 text-muted-foreground">Community</td>
                    <td className="py-3.5 px-4 font-semibold text-primary">Priority Email</td>
                    <td className="py-3.5 px-4 text-muted-foreground">99.99% Uptime + TAM</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto pt-6 space-y-4">
          <div className="text-center space-y-1">
            <h3 className="text-lg font-bold text-foreground">Frequently Asked Questions</h3>
            <p className="text-sm text-muted-foreground">
              Everything you need to know about billing, subscription changes, and plans.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5 shadow-xs">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Help className="size-4 text-primary" />
                Can I switch plans anytime?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes, you can upgrade, downgrade, or cancel your plan at any time through the customer portal. Prorated credits apply automatically.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5 shadow-xs">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Help className="size-4 text-primary" />
                What payment methods are supported?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We accept all major credit cards (Visa, Mastercard, Amex), Apple Pay, Google Pay, and SEPA via Stripe secure billing.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5 shadow-xs">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Help className="size-4 text-primary" />
                What happens if my payment fails?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We provide a 7-day dunning grace period during which your workspace remains fully active while you update your payment card.
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-card p-4 space-y-1.5 shadow-xs">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Help className="size-4 text-primary" />
                Can we request custom enterprise contracts?
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes! Enterprise tiers include custom MSA, SLA commitments, invoice invoicing via wire/ACH, and custom vendor security reviews.
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

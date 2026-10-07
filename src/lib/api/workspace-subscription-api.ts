import type { BillingCycle, ErpPlan, SubscriptionInvoice, WorkspaceSubscription } from "@/types/workspace-subscription"
import { readDocument, writeDocument } from "@/lib/workforce/demo-store"
import { addDays } from "@/lib/workforce/billing"
import { todayIso } from "@/lib/workforce/project-metrics"
import { recordAudit } from "@/lib/workforce/audit"
import { planById } from "@/lib/platform/nexora-catalog"

/** The Nexora ERP plans, cheapest first, priced from the platform catalogue (MAD). Yearly billing costs ten months. */
export const ERP_PLANS: ErpPlan[] = [
  { id: "starter", monthly: planById("starter").monthly, seats: 5, features: ["planFeatProjects", "planFeatTime", "planFeatInvoices", "planFeatSupportEmail"] },
  { id: "business", monthly: planById("business").monthly, seats: 25, features: ["planFeatEverythingStarter", "planFeatQuotes", "planFeatHr", "planFeatAnalytics", "planFeatSupportPriority"] },
  { id: "enterprise", monthly: planById("enterprise").monthly, seats: -1, features: ["planFeatEverythingBusiness", "planFeatUnlimitedSeats", "planFeatSso", "planFeatApi", "planFeatManager"] },
]

export const SUBSCRIPTION_TAX_RATE = 20

export function planPrice(plan: ErpPlan, cycle: BillingCycle) {
  return cycle === "yearly" ? plan.monthly * 10 : plan.monthly
}

function seed(workspaceId: string): WorkspaceSubscription {
  const today = todayIso()
  return workspaceId === "ws_northwind"
    ? { workspaceId, planId: "starter", cycle: "yearly", status: "active", startedAt: addDays(today, -200), renewsAt: addDays(today, 12), paymentMethod: "Mastercard •••• 8810" }
    : { workspaceId, planId: "business", cycle: "monthly", status: "active", startedAt: addDays(today, -420), renewsAt: addDays(today, 18), paymentMethod: "Visa •••• 4242" }
}

const read = (ws: string) => readDocument("subscription", ws, () => seed(ws))

export async function getWorkspaceSubscriptionApi(workspaceId: string) {
  const subscription = read(workspaceId)
  const plan = ERP_PLANS.find((p) => p.id === subscription.planId) ?? ERP_PLANS[0]!
  return { subscription, plan }
}

/** Monthly invoices since the start of the subscription, newest first (last 12). */
export async function listSubscriptionInvoicesApi(workspaceId: string): Promise<SubscriptionInvoice[]> {
  const { subscription, plan } = await getWorkspaceSubscriptionApi(workspaceId)
  const out: SubscriptionInvoice[] = []
  const step = subscription.cycle === "yearly" ? 365 : 30
  let date = addDays(subscription.renewsAt, -step)
  let n = 0
  while (date >= subscription.startedAt && n < 12) {
    const subtotal = planPrice(plan, subscription.cycle)
    const tax = Math.round(subtotal * SUBSCRIPTION_TAX_RATE) / 100
    out.push({
      id: `sinv_${workspaceId}_${n}`,
      number: `NXR-${date.slice(0, 4)}${date.slice(5, 7)}-${workspaceId.replace("ws_", "").slice(0, 3).toUpperCase()}${String(n + 1).padStart(2, "0")}`,
      date,
      planId: plan.id,
      cycle: subscription.cycle,
      subtotal,
      taxRate: SUBSCRIPTION_TAX_RATE,
      tax,
      total: subtotal + tax,
      status: "paid",
    })
    date = addDays(date, -step)
    n++
  }
  return out
}

/**
 * Switches plan or billing cycle. A downgrade is refused while more people
 * have access than the new plan allows.
 */
export async function changeWorkspacePlanApi(workspaceId: string, planId: ErpPlan["id"], cycle: BillingCycle, seatsInUse: number) {
  const plan = ERP_PLANS.find((p) => p.id === planId)
  if (!plan) throw new Error("Unknown plan")
  if (plan.seats >= 0 && seatsInUse > plan.seats) {
    throw new Error(`This plan allows ${plan.seats} users and ${seatsInUse} have access; remove access first`)
  }
  const current = read(workspaceId)
  const next: WorkspaceSubscription = { ...current, planId, cycle, status: "active", renewsAt: current.planId === planId && current.cycle === cycle ? current.renewsAt : addDays(todayIso(), cycle === "yearly" ? 365 : 30) }
  writeDocument("subscription", workspaceId, next)
  recordAudit(workspaceId, { action: "Subscription changed", actionKey: "subscription.changed", category: "Billing", target: "Nexora subscription", before: `${current.planId} · ${current.cycle}`, after: `${planId} · ${cycle}` })
  return next
}

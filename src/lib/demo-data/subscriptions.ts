import {
  Subscription,
  SubscriptionStatus,
  SubscriptionsSummary,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/types/subscriptions"
import { consoleSubscriptions } from "@/lib/platform/console-data"

let demoSubscriptions: Subscription[] = consoleSubscriptions()

export function getDemoSubscriptions(): Subscription[] {
  return [...demoSubscriptions]
}

export function getDemoSubscriptionsSummary(): SubscriptionsSummary {
  let totalRevenue = 0
  let active = 0
  let inactive = 0
  let pending = 0
  let expired = 0
  let canceled = 0

  demoSubscriptions.forEach((sub) => {
    const priceNum = sub.plan?.price ?? (parseFloat(sub.price) || 0)
    if (sub.status === SubscriptionStatus.ACTIVE) {
      totalRevenue += priceNum
      active += 1
    } else if (sub.status === SubscriptionStatus.INACTIVE) {
      inactive += 1
    } else if (sub.status === SubscriptionStatus.PAST_DUE) {
      pending += 1
    } else if (sub.status === SubscriptionStatus.EXPIRED) {
      expired += 1
    } else if (sub.status === SubscriptionStatus.CANCELED) {
      canceled += 1
    }
  })

  return {
    totalRevenue,
    totalSubscriptions: demoSubscriptions.length,
    active,
    inactive,
    pending,
    expired,
    canceled,
    activePercentage:
      demoSubscriptions.length > 0
        ? Math.round((active / demoSubscriptions.length) * 100)
        : 0,
    revenueGrowth: 14.8,
  }
}

export function addDemoSubscription(payload: CreateSubscriptionPayload): Subscription {
  const newSub: Subscription = {
    id: `sub_${Date.now()}`,
    name: payload.name,
    description: payload.description,
    price: payload.price || "29",
    period: payload.period ?? "month",
    status: payload.status ?? SubscriptionStatus.ACTIVE,
    features: payload.features || ["Standard platform features"],
    user: payload.user
      ? { id: payload.user, name: payload.user, email: `${payload.user.toLowerCase()}@workspace.io` }
      : { id: "usr_current", name: "Workspace Admin", email: "admin@nexora.cloud" },
    plan: payload.plan
      ? { id: payload.plan, name: payload.plan.toUpperCase(), price: parseFloat(payload.price) || 29, period: payload.period ?? "month" }
      : { id: "pro", name: "Pro Plan", price: 29, period: "month" },
    nextBilling: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    billingCycle: "monthly",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  demoSubscriptions = [newSub, ...demoSubscriptions]
  return newSub
}

export function updateDemoSubscription(
  id: string,
  payload: UpdateSubscriptionPayload
): Subscription {
  const index = demoSubscriptions.findIndex((s) => s.id === id)
  const existing = demoSubscriptions[index]
  if (index === -1 || !existing) {
    throw new Error(`Subscription ${id} not found`)
  }
  const updated: Subscription = {
    ...existing,
    name: payload.name ?? existing.name,
    description: payload.description ?? existing.description,
    price: payload.price ?? existing.price,
    period: payload.period !== undefined ? payload.period : existing.period,
    status: payload.status ?? existing.status,
    features: payload.features ?? existing.features,
    updatedAt: new Date().toISOString(),
  }
  demoSubscriptions[index] = updated
  return updated
}

export function deleteDemoSubscription(id: string): void {
  demoSubscriptions = demoSubscriptions.filter((s) => s.id !== id)
}

export function cancelDemoSubscription(id: string): Subscription {
  const index = demoSubscriptions.findIndex((s) => s.id === id)
  const existing = demoSubscriptions[index]
  if (index === -1 || !existing) {
    throw new Error(`Subscription ${id} not found`)
  }
  const canceled: Subscription = {
    ...existing,
    status: SubscriptionStatus.CANCELED,
    nextBilling: null,
    updatedAt: new Date().toISOString(),
  }
  demoSubscriptions[index] = canceled
  return canceled
}


import {
  Subscription,
  SubscriptionStatus,
  SubscriptionsSummary,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/types/subscriptions"

let demoSubscriptions: Subscription[] = [
  {
    id: "sub_01",
    name: "Enterprise SLA & Dedicated Pod",
    description: "Unlimited seats, dedicated compute cluster, 99.99% uptime SLA",
    price: "990",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["Unlimited seats", "Dedicated cluster", "SSO/SAML", "24/7 Phone Support"],
    user: {
      id: "usr_1",
      name: "Sarah Connor",
      email: "sarah.c@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&q=80",
    },
    plan: {
      id: "enterprise",
      name: "Enterprise Plan",
      price: 990,
      period: "month",
    },
    nextBilling: "2026-10-15T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-01-15T10:00:00.000Z",
    updatedAt: "2026-09-01T08:30:00.000Z",
  },
  {
    id: "sub_02",
    name: "Growth Team Pro Workspace",
    description: "25 seats, audit logging, advanced rate limits, priority webhooks",
    price: "290",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["25 Team seats", "Audit logging", "Priority webhooks", "Advanced analytics"],
    user: {
      id: "usr_2",
      name: "Alex Chen",
      email: "alex.chen@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan",
      price: 290,
      period: "month",
    },
    nextBilling: "2026-10-20T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-02-20T11:00:00.000Z",
    updatedAt: "2026-08-20T14:15:00.000Z",
  },
  {
    id: "sub_03",
    name: "Engineering Core Pro",
    description: "Power tools, full API gateway access, 100k requests/month",
    price: "290",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["Full API access", "Webhooks", "Custom domains", "Daily automated backups"],
    user: {
      id: "usr_3",
      name: "Elena Rostova",
      email: "elena.r@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan",
      price: 290,
      period: "month",
    },
    nextBilling: "2026-10-28T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-03-28T09:12:00.000Z",
    updatedAt: "2026-09-02T16:45:00.000Z",
  },
  {
    id: "sub_04",
    name: "Global Operations Enterprise",
    description: "Multi-region failover, custom compliance reporting, SOC2 audit support",
    price: "1200",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["Multi-region", "SOC2 reports", "Dedicated account executive", "Custom SLA"],
    user: {
      id: "usr_4",
      name: "Marcus Vance",
      email: "marcus.v@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&q=80",
    },
    plan: {
      id: "enterprise",
      name: "Enterprise Plan",
      price: 1200,
      period: "month",
    },
    nextBilling: "2026-11-05T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-04-05T15:20:00.000Z",
    updatedAt: "2026-09-05T12:00:00.000Z",
  },
  {
    id: "sub_05",
    name: "Design Studio Pro Annual",
    description: "Annual commitment with high asset storage limits and seat pooling",
    price: "2900",
    period: "year",
    status: SubscriptionStatus.ACTIVE,
    features: ["50GB asset storage", "Seat pooling", "Real-time sync", "Priority support"],
    user: {
      id: "usr_5",
      name: "Olivia Diaz",
      email: "olivia.d@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan (Annual)",
      price: 2900,
      period: "year",
    },
    nextBilling: "2027-05-12T00:00:00.000Z",
    billingCycle: "annually",
    createdAt: "2026-05-12T08:00:00.000Z",
    updatedAt: "2026-05-12T08:00:00.000Z",
  },
  {
    id: "sub_06",
    name: "FinTech Gateway Pro",
    description: "Card renewal pending — 3 days remaining in dunning grace period",
    price: "290",
    period: "month",
    status: SubscriptionStatus.PAST_DUE,
    features: ["API rate limits", "Audit logs", "Webhook streams"],
    user: {
      id: "usr_6",
      name: "David Kim",
      email: "david.k@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan",
      price: 290,
      period: "month",
    },
    nextBilling: "2026-09-27T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-06-01T12:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "sub_07",
    name: "DataLab Analytics Pro",
    description: "Trial migration completed, active renewal scheduled",
    price: "290",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["Analytics export", "Query caching", "Priority support"],
    user: {
      id: "usr_7",
      name: "Amara Okafor",
      email: "amara.o@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan",
      price: 290,
      period: "month",
    },
    nextBilling: "2026-10-10T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-07-10T14:30:00.000Z",
    updatedAt: "2026-09-10T14:30:00.000Z",
  },
  {
    id: "sub_08",
    name: "Legacy Starter Subscription",
    description: "Voluntarily canceled at end of billing cycle",
    price: "49",
    period: "month",
    status: SubscriptionStatus.CANCELED,
    features: ["Basic analytics", "Standard support"],
    user: {
      id: "usr_8",
      name: "Liam O'Connor",
      email: "liam.oc@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=128&q=80",
    },
    plan: {
      id: "starter",
      name: "Starter Plan",
      price: 49,
      period: "month",
    },
    nextBilling: null,
    billingCycle: "monthly",
    createdAt: "2025-11-15T10:00:00.000Z",
    updatedAt: "2026-08-30T17:00:00.000Z",
  },
  {
    id: "sub_09",
    name: "AI Research Pod Enterprise",
    description: "GPU accelerated workflows and dedicated private model routing",
    price: "1500",
    period: "month",
    status: SubscriptionStatus.ACTIVE,
    features: ["Private model routing", "Enterprise SLA", "Dedicated TAM", "SSO"],
    user: {
      id: "usr_9",
      name: "Sofia Morales",
      email: "sofia.m@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=128&q=80",
    },
    plan: {
      id: "enterprise",
      name: "Enterprise Plan",
      price: 1500,
      period: "month",
    },
    nextBilling: "2026-10-01T00:00:00.000Z",
    billingCycle: "monthly",
    createdAt: "2026-08-01T09:00:00.000Z",
    updatedAt: "2026-09-01T09:00:00.000Z",
  },
  {
    id: "sub_10",
    name: "Tokyo Regional Node Pro",
    description: "Subscription expired after trial evaluation period concluded",
    price: "290",
    period: "month",
    status: SubscriptionStatus.EXPIRED,
    features: ["Tokyo Edge CDN", "Standard rate limits"],
    user: {
      id: "usr_10",
      name: "Yuki Tanaka",
      email: "yuki.t@nexora.cloud",
      avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&q=80",
    },
    plan: {
      id: "pro",
      name: "Pro Plan",
      price: 290,
      period: "month",
    },
    nextBilling: null,
    billingCycle: "monthly",
    createdAt: "2026-03-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  },
]

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


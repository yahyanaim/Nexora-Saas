export enum SubscriptionStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  CANCELED = "canceled",
  EXPIRED = "expired",
  PAST_DUE = "past-due",
}

export interface SubscriptionUser {
  id: string
  name: string
  email: string
  avatar?: string | null
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  period: string
}

export interface Subscription {
  id: string
  name: string
  description?: string
  price: string
  period: string | null
  status: SubscriptionStatus
  features: string[]
  user?: SubscriptionUser
  plan?: SubscriptionPlan
  nextBilling?: string | null
  billingCycle?: string
  createdAt: string
  updatedAt?: string
}

export interface SubscriptionsSummary {
  totalRevenue: number
  totalSubscriptions: number
  active: number
  inactive: number
  pending: number
  expired: number
  canceled: number
  activePercentage: number
  revenueGrowth: number
}

export interface CreateSubscriptionPayload {
  name: string
  description?: string
  price: string
  period?: string | null
  status?: SubscriptionStatus
  features: string[]
  user?: string
  plan?: string
}

export interface UpdateSubscriptionPayload extends Partial<CreateSubscriptionPayload> {}

export interface SubscriptionFilters {
  status?: SubscriptionStatus[]
  planName?: string[]
  billingCycle?: string[]
}

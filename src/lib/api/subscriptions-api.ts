export * from "./billing-apis"
import { billingApi } from "./billing-apis"
import {
  Subscription,
  SubscriptionsSummary,
  SubscriptionStatus,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/types/subscriptions"
import { ApiPaginatedResponse } from "@/types/tables"

export const fetchSubscriptionsApi = async (_params?: unknown): Promise<ApiPaginatedResponse<Subscription>> => {
  return {
    success: true,
    data: [],
    pagination: {
      page: 0,
      pageSize: 10,
      totalItems: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  }
}

export const fetchSubscriptionsSummaryApi = async (): Promise<SubscriptionsSummary> => {
  return {
    totalRevenue: 0,
    totalSubscriptions: 0,
    active: 0,
    inactive: 0,
    pending: 0,
    expired: 0,
    canceled: 0,
    activePercentage: 0,
    revenueGrowth: 0,
  }
}

export const createSubscriptionApi = async (payload: CreateSubscriptionPayload): Promise<Subscription> => {
  return { id: "sub_new", ...payload, status: SubscriptionStatus.ACTIVE, createdAt: new Date().toISOString() } as unknown as Subscription
}

export const updateSubscriptionApi = async (id: string, payload: UpdateSubscriptionPayload): Promise<Subscription> => {
  return { id, ...payload } as unknown as Subscription
}

export const deleteSubscriptionApi = async (_id: string): Promise<void> => {}
export const cancelSubscriptionApi = async (_id: string): Promise<void> => {}

export default billingApi

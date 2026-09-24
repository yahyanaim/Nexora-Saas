export * from "./billing-apis"
import { billingApi } from "./billing-apis"
import apiClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import {
  Subscription,
  SubscriptionsSummary,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
} from "@/types/subscriptions"
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import {
  getDemoSubscriptions,
  getDemoSubscriptionsSummary,
  addDemoSubscription,
  updateDemoSubscription,
  deleteDemoSubscription,
  cancelDemoSubscription,
  paginateDemoList,
} from "@/lib/demo-data"

/**
 * Retrieves a paginated list of subscriptions matching query parameters.
 * Implements the Dual-Mode Resiliency Pattern: attempts to fetch live records
 * from `/subscriptions` via the backend proxy, falling back to the in-memory demo engine
 * upon network disconnect or HTTP failure.
 */
export const fetchSubscriptionsApi = async (
  params: Partial<ServerTableParams> = {}
): Promise<ApiPaginatedResponse<Subscription>> => {
  try {
    const { data } = await apiClient.get("/subscriptions")
    const rawList: Subscription[] = Array.isArray(data)
      ? data
      : (data as { data?: Subscription[] })?.data || []
    if (rawList.length > 0) {
      return paginateDemoList(
        rawList,
        params,
        (s, search) =>
          s.name.toLowerCase().includes(search) ||
          (s.user?.name?.toLowerCase().includes(search) ?? false) ||
          (s.user?.email?.toLowerCase().includes(search) ?? false) ||
          (s.plan?.name?.toLowerCase().includes(search) ?? false)
      )
    }
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch subscriptions")
    console.error("[API Error] fetchSubscriptionsApi failed:", message)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  return paginateDemoList(
    getDemoSubscriptions(),
    params,
    (s, search) =>
      s.name.toLowerCase().includes(search) ||
      (s.user?.name?.toLowerCase().includes(search) ?? false) ||
      (s.user?.email?.toLowerCase().includes(search) ?? false) ||
      (s.plan?.name?.toLowerCase().includes(search) ?? false)
  )
}

/**
 * Retrieves platform-wide subscriptions KPI summary metrics.
 */
export const fetchSubscriptionsSummaryApi = async (): Promise<SubscriptionsSummary> => {
  try {
    const { data } = await apiClient.get<SubscriptionsSummary>("/subscriptions/summary")
    if (data && data.totalSubscriptions > 0) {
      return data
    }
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch subscriptions summary")
    console.error("[API Error] fetchSubscriptionsSummaryApi failed:", message)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
  }

  return getDemoSubscriptionsSummary()
}

/**
 * Creates a new customer subscription.
 */
export const createSubscriptionApi = async (
  payload: CreateSubscriptionPayload
): Promise<Subscription> => {
  try {
    const { data } = await apiClient.post<Subscription>("/subscriptions", payload)
    return data
  } catch (error) {
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
    return addDemoSubscription(payload)
  }
}

/**
 * Updates an existing subscription.
 */
export const updateSubscriptionApi = async (
  id: string,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> => {
  try {
    const { data } = await apiClient.put<Subscription>(`/subscriptions/${id}`, payload)
    return data
  } catch (error) {
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
    return updateDemoSubscription(id, payload)
  }
}

/**
 * Permanently deletes a subscription record.
 */
export const deleteSubscriptionApi = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/subscriptions/${id}`)
  } catch (error) {
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
    deleteDemoSubscription(id)
  }
}

/**
 * Cancels an active subscription.
 */
export const cancelSubscriptionApi = async (id: string): Promise<void> => {
  try {
    await apiClient.post(`/subscriptions/${id}/cancel`)
  } catch (error) {
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
    cancelDemoSubscription(id)
  }
}

export default billingApi

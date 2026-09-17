import axios from "axios"
import apiClient from "@/lib/myapi/client"
import { BillingPlan } from "@/types/plans"
import { SubscriptionInfo } from "@/types/subscriptions"

export type { BillingPlan, SubscriptionInfo }

/**
 * Pure predicate: is this failure a plan-gate rejection?
 * Used by the global axios interceptor and UI to route to pricing.
 */
export function isUpgradeRequired(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  const data = error.response?.data as { code?: string } | undefined
  return error.response?.status === 403 && data?.code === "upgrade_required"
}

export const billingApi = {
  getSubscription: async (): Promise<SubscriptionInfo> => {
    const response = await apiClient.get("/billing/subscription")
    return response.data
  },

  /** Creates a Stripe Checkout Session; caller redirects to the returned URL. */
  createCheckout: async (
    plan: "pro" | "enterprise"
  ): Promise<{ url: string }> => {
    const response = await apiClient.post("/billing/checkout", { plan })
    return response.data
  },

  /** Creates a Stripe customer-portal session for self-serve management. */
  createPortal: async (): Promise<{ url: string }> => {
    const response = await apiClient.post("/billing/portal")
    return response.data
  },
}

export const fetchSubscriptionApi = billingApi.getSubscription
export const createCheckoutApi = billingApi.createCheckout
export const createPortalApi = billingApi.createPortal

export default billingApi

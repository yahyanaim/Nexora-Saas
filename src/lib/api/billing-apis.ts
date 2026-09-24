import axios from "axios"
import apiClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import { BillingPlan } from "@/types/plans"
import { SubscriptionInfo } from "@/types/subscriptions"

export type { BillingPlan, SubscriptionInfo }

export const DEMO_SUBSCRIPTION_INFO: SubscriptionInfo = {
  orgId: "org-demo-workspace",
  plan: "pro",
  status: "active",
  provider: "stripe",
  currentPeriodEnd: "2026-12-31T23:59:59.000Z",
  access: true,
  graceUntil: null,
  hasPaymentMethod: true,
}

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
    try {
      const response = await apiClient.get<SubscriptionInfo>("/billing/subscription")
      return response.data
    } catch (error) {
      const message = apiErrorMessage(error, "Failed to fetch subscription info")
      console.error("[API Error] getSubscription failed:", message)
      if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        return DEMO_SUBSCRIPTION_INFO
      }
      throw error
    }
  },

  /** Creates a Stripe Checkout Session; caller redirects to the returned URL. */
  createCheckout: async (
    plan: "pro" | "enterprise"
  ): Promise<{ url: string }> => {
    try {
      const response = await apiClient.post<{ url: string }>("/billing/checkout", { plan })
      return response.data
    } catch (error) {
      const message = apiErrorMessage(error, "Failed to create checkout session")
      console.error("[API Error] createCheckout failed:", message)
      if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        return { url: `/dashboard/billing/success?plan=${plan}&demo=true` }
      }
      throw error
    }
  },

  /** Creates a Stripe customer-portal session for self-serve management. */
  createPortal: async (): Promise<{ url: string }> => {
    try {
      const response = await apiClient.post<{ url: string }>("/billing/portal")
      return response.data
    } catch (error) {
      const message = apiErrorMessage(error, "Failed to open billing portal")
      console.error("[API Error] createPortal failed:", message)
      if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
        return { url: "" }
      }
      throw error
    }
  },
}

export const fetchSubscriptionApi = billingApi.getSubscription
export const createCheckoutApi = billingApi.createCheckout
export const createPortalApi = billingApi.createPortal

export default billingApi


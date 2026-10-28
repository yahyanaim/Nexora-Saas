import axios from "axios"
import apiClient, { apiErrorMessage, shouldUseDemoFallback } from "@/lib/myapi/client"
import { isDemoMode } from "@/lib/auth/demo-mode"
import { BillingPlan } from "@/types/plans"
import { SubscriptionInfo } from "@/types/subscriptions"
import { logger } from "@/lib/logger"

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
      if (response?.data) return response.data
    } catch (error) {
      const message = apiErrorMessage(error, "Failed to fetch subscription info")
      if (shouldUseDemoFallback(error)) {
        logger.debug("[demo] getSubscription uses demo data:", message)
        return DEMO_SUBSCRIPTION_INFO
      }
      logger.error("[API Error] getSubscription failed:", message)
      throw error
    }
    if (isDemoMode()) return DEMO_SUBSCRIPTION_INFO
    throw new Error("No subscription data received")
  },
}

export const fetchSubscriptionApi = billingApi.getSubscription

export default billingApi

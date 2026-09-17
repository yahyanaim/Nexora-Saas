"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSubscriptionApi } from "@/lib/api/billing-apis"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import {
  FEATURE_FLAGS,
  FeatureFlagKey,
  isFeatureEnabledForPlan,
} from "@/lib/feature-flags/feature-flags"
import { BillingPlan } from "@/types/plans"
import { isSuperUser } from "@/lib/permissions/can"

export function useFeatureFlag(flag: FeatureFlagKey) {
  const { user } = useAuthGuard()

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["currentSubscription"],
    queryFn: fetchSubscriptionApi,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const config = FEATURE_FLAGS[flag]
  const currentPlan: BillingPlan = subscription?.plan || "free"

  if (isSuperUser(user)) {
    return {
      enabled: true,
      isLoading: false,
      currentPlan,
      requiredPlan: config.minPlan,
      config,
    }
  }

  const enabled = isFeatureEnabledForPlan(flag, currentPlan)

  return {
    enabled,
    isLoading,
    currentPlan,
    requiredPlan: config.minPlan,
    config,
  }
}

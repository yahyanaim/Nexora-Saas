"use client"

import React from "react"
import { useQuery } from "@tanstack/react-query"
import { fetchSubscriptionApi } from "@/lib/api/billing-apis"
import { useAuthGuard } from "@/hooks/auth/use-auth-guard"
import { BillingPlan } from "@/types/plans"
import { isSuperUser } from "@/lib/permissions/can"

const PLAN_HIERARCHY: Record<BillingPlan, number> = {
  free: 0,
  pro: 1,
  enterprise: 2,
}

interface PlanGuardProps {
  requiredPlan: BillingPlan
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative subscription tier gatekeeper.
 * Renders `children` only if the organization's plan tier is greater than or equal
 * to `requiredPlan`. Super-admins bypass this restriction automatically.
 *
 * @example
 * <PlanGuard requiredPlan="pro" fallback={<UpgradeBadge />}>
 *   <AdvancedAnalytics />
 * </PlanGuard>
 */
export function PlanGuard({
  requiredPlan,
  fallback = null,
  children,
}: PlanGuardProps) {
  const { user } = useAuthGuard()

  const { data: subscription, isLoading } = useQuery({
    queryKey: ["currentSubscription"],
    queryFn: fetchSubscriptionApi,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  // Super-admins and owners bypass plan checks
  if (isSuperUser(user)) {
    return <>{children}</>
  }

  if (isLoading) {
    return null
  }

  const currentPlan: BillingPlan = subscription?.plan || "free"
  const currentRank = PLAN_HIERARCHY[currentPlan] ?? 0
  const requiredRank = PLAN_HIERARCHY[requiredPlan] ?? 0

  if (currentRank >= requiredRank && subscription?.access !== false) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

export default PlanGuard

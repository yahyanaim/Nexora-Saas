"use client"

import { useQuery } from "@tanstack/react-query"
import {
  fetchUsageApi,
  UsageSummary,
  ResourceUsage,
} from "@/lib/api/usage-metering"

export function useUsage() {
  const {
    data: usage,
    isLoading,
    isError,
    refetch,
  } = useQuery<UsageSummary>({
    queryKey: ["resourceUsage"],
    queryFn: fetchUsageApi,
    staleTime: 60 * 1000,
  })

  const getMetricPercentage = (metric?: ResourceUsage): number => {
    if (!metric || metric.limit <= 0) return 0
    return Math.min(100, Math.round((metric.used / metric.limit) * 100))
  }

  const isNearLimit = (
    resource: keyof Omit<UsageSummary, "billingCycleEnd">,
    threshold = 80
  ): boolean => {
    if (!usage) return false
    const metric = usage[resource]
    if (!metric || metric.limit === -1) return false
    return getMetricPercentage(metric) >= threshold
  }

  const isOverLimit = (
    resource: keyof Omit<UsageSummary, "billingCycleEnd">
  ): boolean => {
    if (!usage) return false
    const metric = usage[resource]
    if (!metric || metric.limit === -1) return false
    return metric.used >= metric.limit
  }

  return {
    usage,
    isLoading,
    isError,
    refetch,
    getMetricPercentage,
    isNearLimit,
    isOverLimit,
  }
}

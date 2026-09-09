"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSubscriptionsSummaryApi } from "@/lib/api/subscriptions-api"

export function useSubscriptionsSummary() {
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["subscriptions-summary"],
    queryFn: fetchSubscriptionsSummaryApi,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  return {
    summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  }
}

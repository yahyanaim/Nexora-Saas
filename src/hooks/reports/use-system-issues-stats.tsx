// hooks/reports/use-system-issues-stats.ts

"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSystemIssuesStatsApi } from "@/lib/api/reports-apis"

export function useSystemIssuesStats() {
  const {
    data: stats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["system-issues-stats"],
    queryFn: fetchSystemIssuesStatsApi,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  })

  return {
    stats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  }
}

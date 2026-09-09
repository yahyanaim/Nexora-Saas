"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchContentReportsStatsApi } from "@/lib/api/reports-apis"

export function useContentReportsStats() {
  const {
    data: stats,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["content-reports-stats"],
    queryFn: fetchContentReportsStatsApi,
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

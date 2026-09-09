// hooks/projects/use-projects-summary.ts

"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchProjectsSummaryApi } from "@/lib/api/projects-api"

export function useProjectsSummary() {
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["projects-summary"],
    queryFn: fetchProjectsSummaryApi,
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

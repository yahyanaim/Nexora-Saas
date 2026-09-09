"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchFilesSummaryApi } from "@/lib/api/files-api"

export function useFilesSummary() {
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["files-summary"],
    queryFn: fetchFilesSummaryApi,
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

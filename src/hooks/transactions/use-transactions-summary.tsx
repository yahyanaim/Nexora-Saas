"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchTransactionsSummaryApi } from "@/lib/api/transactions-api"

export function useTransactionsSummary() {
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["transactions-summary"],
    queryFn: fetchTransactionsSummaryApi,
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

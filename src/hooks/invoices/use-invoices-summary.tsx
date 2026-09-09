"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchInvoicesSummaryApi } from "@/lib/api/invoices-api"

export function useInvoicesSummary() {
  const {
    data: summary,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["invoices-summary"],
    queryFn: fetchInvoicesSummaryApi,
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

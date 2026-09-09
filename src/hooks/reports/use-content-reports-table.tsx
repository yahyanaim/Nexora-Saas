"use client"
import { useServerTable } from "@/hooks/tables/use-server-table"
import { ContentReport } from "@/types/reports"
import { fetchContentReportsApi } from "@/lib/api/reports-apis"

export function useContentReportsTable() {
  return useServerTable<ContentReport>({
    queryKey: "content-reports",
    queryFn: fetchContentReportsApi,
  })
}

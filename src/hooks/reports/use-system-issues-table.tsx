"use client"
import { useServerTable } from "@/hooks/tables/use-server-table"
import { SystemIssue } from "@/types/reports"
import { fetchSystemIssuesApi } from "@/lib/api/reports-apis"

export function useSystemIssuesTable() {
  return useServerTable<SystemIssue>({
    queryKey: "system-issues-reports",
    queryFn: fetchSystemIssuesApi,
  })
}

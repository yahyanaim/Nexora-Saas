"use client"

import { useServerTable } from "../tables/use-server-table"
import { fetchSessionsApi } from "@/lib/api/sessions-apis"

export function useFetchSessionsTable() {
  return useServerTable({
    queryKey: "sessions",
    queryFn: fetchSessionsApi,
  })
}

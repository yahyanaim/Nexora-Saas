"use client"

import { useServerTable } from "../tables/use-server-table"
import { fetchRolesListApi } from "@/lib/api/roles-apis"

export function useFetchRolesTable() {
  return useServerTable({
    queryKey: "roles",
    queryFn: fetchRolesListApi,
  })
}

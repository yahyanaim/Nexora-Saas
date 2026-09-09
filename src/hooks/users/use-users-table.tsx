"use client"

import { useServerTable } from "@/hooks/tables/use-server-table"
import { fetchUsersApi } from "@/lib/api/users-apis"
import { FilterItem } from "@/types/tables"
import { User } from "@/types/users"

interface UseUsersTableOptions {
  defaultFilters?: FilterItem[]
}

export function useUsersTable({
  defaultFilters = [],
}: UseUsersTableOptions = {}) {
  return useServerTable<User>({
    queryKey: "users",
    queryFn: fetchUsersApi,
    extraParams: {
      defaultFilters,
    },
  })
}

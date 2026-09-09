"use client"

import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { fetchRolesListApi } from "@/lib/api/roles-apis"
import { useDebounce } from "../use-debounce"
import { ActivationStatus } from "@/types/users"

export function useRolesOptions() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const query = useQuery({
    queryKey: ["roles-options", debouncedSearch],
    queryFn: () =>
      fetchRolesListApi({
        page: 0,
        pageSize: 20,
        search: debouncedSearch || undefined,
        filter: [
          { field: "status", operator: "eq", value: ActivationStatus.ACTIVE },
        ],
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    select: (data) => data.data,
  })

  return {
    ...query,
    search,
    setSearch,
  }
}

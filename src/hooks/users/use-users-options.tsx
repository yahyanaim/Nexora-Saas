"use client"

import { useState } from "react"
import { useQuery, keepPreviousData } from "@tanstack/react-query"
import { useDebounce } from "../use-debounce"
import { ActivationStatus } from "@/types/users"
import { fetchUsersApi } from "@/lib/api/users-apis"

export function useUsersOptions() {
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 300)

  const query = useQuery({
    queryKey: ["users-options", debouncedSearch],
    queryFn: () =>
      fetchUsersApi({
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

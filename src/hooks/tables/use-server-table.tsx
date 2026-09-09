"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from "@tanstack/react-table"
import { useDebounce } from "../use-debounce"
import {
  FilterItem,
  FilterOperator,
  ServerTableParams,
  ApiPaginatedResponse,
  toTableResponse,
} from "@/types/tables"

export type FilterFieldConfig = Record<string, FilterOperator>

interface UseServerTableOptions<T, E extends Record<string, any> = {}> {
  queryKey: string
  queryFn: (params: ServerTableParams & E) => Promise<ApiPaginatedResponse<T>>
  initialPageSize?: number
  extraParams?: E
  resetPageOnExtraParamsChange?: boolean
  filterOperators?: FilterFieldConfig
}

export function buildApiFilters(
  columnFilters: ColumnFiltersState,
  filterOperators: FilterFieldConfig = {}
): FilterItem[] {
  return columnFilters
    .filter((f) => {
      if (f.value === undefined || f.value === null || f.value === "")
        return false
      if (Array.isArray(f.value) && f.value.length === 0) return false
      return true
    })
    .map((f) => {
      const value = f.value
      const operator: FilterOperator =
        filterOperators[f.id] ?? (Array.isArray(value) ? "in" : "eq")

      return {
        field: f.id,
        operator,
        value: value as FilterItem["value"],
      }
    })
}

export function useServerTable<T, E extends Record<string, any> = {}>({
  queryKey,
  queryFn,
  initialPageSize = 20,
  extraParams = {} as E,
  resetPageOnExtraParamsChange = true,
  filterOperators = {},
}: UseServerTableOptions<T, E>) {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 400)

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: initialPageSize,
  })
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  const apiFilters = useMemo(
    () => buildApiFilters(columnFilters, filterOperators),
    [columnFilters, filterOperators]
  )
  const sort = sorting[0]

  const extraParamsKey = JSON.stringify(extraParams)
  const isFirstRun = useRef(true)

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (resetPageOnExtraParamsChange) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }, [extraParamsKey])

  const finalQuery: any = [queryKey]

  if (pagination.pageIndex !== undefined && pagination.pageIndex !== null) {
    finalQuery.push(pagination.pageIndex.toString())
  }

  if (pagination.pageSize !== undefined && pagination.pageSize !== null) {
    finalQuery.push(pagination.pageSize.toString())
  }

  if (debouncedSearch && debouncedSearch.trim() !== "") {
    finalQuery.push(debouncedSearch.toString())
  }

  if (sort?.id) {
    finalQuery.push(sort.id)
  }

  if (sort?.desc !== undefined && sort?.desc !== null) {
    finalQuery.push(sort.desc ? "desc" : "asc")
  }

  if (extraParamsKey && extraParamsKey !== "{}") {
    finalQuery.push(extraParamsKey)
  }

  if (apiFilters && apiFilters.length > 0) {
    finalQuery.push(apiFilters)
  }

  const { data, isLoading, isFetching, isError, error } = useQuery({
    refetchOnWindowFocus: false,
    queryKey: finalQuery,
    queryFn: () =>
      queryFn({
        page: pagination.pageIndex,
        pageSize: pagination.pageSize,
        search: debouncedSearch || undefined,
        filter: apiFilters.length ? apiFilters : undefined,
        sortBy: sort?.id,
        sortOrder: sort ? (sort.desc ? "desc" : "asc") : undefined,
        ...extraParams,
      }),
    placeholderData: (prev) => prev,
  })

  const tableData = useMemo(() => {
    if (!data)
      return {
        items: [],
        pagination: { page: 0, pageSize: 0, totalItems: 0, totalPages: 0 },
      }
    return toTableResponse(data)
  }, [data])

  return {
    items: tableData.items,
    pageCount: tableData.pagination.totalPages ?? -1,
    totalItems: tableData.pagination.totalItems ?? 0,
    isLoading,
    isFetching,
    isError,
    error,
    search,
    setSearch,
    pagination,
    setPagination,
    columnFilters,
    setColumnFilters,
    sorting,
    setSorting,
    refresh: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  }
}

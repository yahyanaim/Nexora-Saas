export type FilterOperator = "eq" | "ne" | "in" | "contains" | "gte" | "lte"

export interface FilterItem {
  field: string
  operator: FilterOperator
  value: string | string[] | number | boolean
}

export interface Pagination {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage?: boolean
  hasPrevPage?: boolean
}

export interface ApiPaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: Pagination
}

export interface ServerTableParams {
  page: number
  pageSize: number
  search?: string
  filter?: FilterItem[]
  sortBy?: string
  defaultFilters?: FilterItem[]
  sortOrder?: "asc" | "desc"
}

export interface EntityApi<T, TCreateInput, TUpdateInput> {
  create: (input: TCreateInput) => Promise<T>
  update: (id: string, input: TUpdateInput) => Promise<T>
  remove?: (id: string) => Promise<void>
}

export function toTableResponse<T>(
  response: ApiPaginatedResponse<T>
): PaginatedResponse<T> {
  return {
    items: response.data || [],
    pagination: {
      page: response.pagination?.page || 0,
      pageSize: response.pagination?.pageSize || 0,
      totalItems: response.pagination?.totalItems || 0,
      totalPages: response.pagination?.totalPages || 0,
      hasNextPage: response.pagination?.hasNextPage || false,
      hasPrevPage: response.pagination?.hasPrevPage || false,
    },
  }
}

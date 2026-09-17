import { Session, SessionStatus } from "@/types/sessions"
import httpClient from "@/lib/myapi/client"
import { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"

export const fetchSessionsApi = async ({
  page = 0,
  pageSize = 10,
  filter,
  search,
  sortBy,
  sortOrder,
}: ServerTableParams): Promise<ApiPaginatedResponse<Session>> => {
  const { data } = await httpClient.get("/sessions", {
    params: {
      page,
      pageSize,
      ...(filter?.length && { filter: JSON.stringify(filter) }),
      ...(search && { search }),
      ...(sortBy && { sortBy, sortOrder: sortOrder ?? "asc" }),
    },
  })

  return {
    success: data.success ?? true,
    data: data.data || [],
    pagination: {
      page: data.pagination?.page || 0,
      pageSize: data.pagination?.pageSize || 0,
      totalItems: data.pagination?.totalItems || data.pagination?.total || 0,
      totalPages: data.pagination?.totalPages || 0,
      hasNextPage: data.pagination?.hasNextPage || false,
      hasPrevPage: data.pagination?.hasPrevPage || false,
    },
  }
}

export const getSessionApi = async (id: string): Promise<Session> => {
  const { data } = await httpClient.get(`/sessions/${id}`)
  return data.data
}

export const updateSessionApi = async (
  id: string,
  status: string
): Promise<Session> => {
  const { data } = await httpClient.patch(`/sessions/${id}`, { status })
  return data.data
}

export const activeSessionApi = async (id: string): Promise<Session> => {
  return updateSessionApi(id, SessionStatus.ACTIVE)
}

export const inactiveSessionApi = async (id: string): Promise<Session> => {
  return updateSessionApi(id, SessionStatus.INACTIVE)
}

export const deleteSessionApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/sessions/${id}`)
  return data?.data
}

export const getMySessionsApi = async (): Promise<Session[]> => {
  const { data } = await httpClient.get("/sessions/me")
  return data.data || []
}

export const invalidateAllSessionsApi = async (): Promise<void> => {
  const { data } = await httpClient.post("/sessions/me")
  return data?.data
}

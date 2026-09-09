import httpClient from "./http-client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type { Role, CreateRolePayload, UpdateRolePayload } from "@/types/roles"
import { ActivationStatus } from "@/types/users"

export const fetchRolesListApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Role>> => {
  const { data } = await httpClient.get("/roles", {
    params: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sort:
        params.sortBy && params.sortOrder
          ? JSON.stringify({
              [params.sortBy]: params.sortOrder === "desc" ? -1 : 1,
            })
          : undefined,
      filter: params.filter ? JSON.stringify(params.filter) : undefined,
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

export const createRoleApi = async (
  payload: CreateRolePayload
): Promise<Role> => {
  const { data } = await httpClient.post("/roles", payload)

  return data.data
}

export const updateRoleApi = async (
  roleId: string,
  payload: UpdateRolePayload
): Promise<Role> => {
  const { data } = await httpClient.patch(`/roles/${roleId}`, payload)

  return data.data
}

export const deleteRoleApi = async (roleId: string): Promise<void> => {
  const { data } = await httpClient.delete(`/roles/${roleId}`)

  return data
}

export const toggleRoleStatusApi = async (
  roleId: string,
  status: ActivationStatus
): Promise<Role> => {
  const { data } = await httpClient.patch(`/roles/${roleId}`, { status })

  return data.data
}

export const getRoleApi = async (roleId: string): Promise<Role> => {
  const { data } = await httpClient.get(`/roles/${roleId}`)
  return data.data
}

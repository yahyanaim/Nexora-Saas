import httpClient from "@/lib/myapi/client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type { Role, CreateRolePayload, UpdateRolePayload } from "@/types/roles"
import { ActivationStatus } from "@/types/users"
import { SessionStatus } from "@/types/sessions"
import {
  getDemoRoles,
  addDemoRole,
  deleteDemoRole,
  paginateDemoList,
} from "@/lib/demo-data"

export const fetchRolesListApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Role>> => {
  try {
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

    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
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
  } catch {
    // Fallback to demo roles
  }

  return paginateDemoList(
    getDemoRoles(),
    params,
    (role, search) =>
      role.name.toLowerCase().includes(search) ||
      role.permissions.some((p) => p.toLowerCase().includes(search))
  )
}

export const createRoleApi = async (
  payload: CreateRolePayload
): Promise<Role> => {
  try {
    const { data } = await httpClient.post("/roles", payload)
    return data.data
  } catch {
    return addDemoRole(payload)
  }
}

export const updateRoleApi = async (
  roleId: string,
  payload: UpdateRolePayload
): Promise<Role> => {
  try {
    const { data } = await httpClient.patch(`/roles/${roleId}`, payload)
    return data.data
  } catch {
    const found = getDemoRoles().find((r) => r.id === roleId)
    if (!found) return getDemoRoles()[0]!
    const updatedStatus: ActivationStatus | undefined =
      payload.status !== undefined
        ? payload.status === SessionStatus.ACTIVE
          ? ActivationStatus.ACTIVE
          : ActivationStatus.INACTIVE
        : undefined

    return {
      ...found,
      ...(payload.name ? { name: payload.name } : {}),
      ...(payload.permissions ? { permissions: payload.permissions } : {}),
      ...(updatedStatus ? { status: updatedStatus } : {}),
      updatedAt: new Date().toISOString(),
    }
  }
}

export const deleteRoleApi = async (roleId: string): Promise<void> => {
  try {
    await httpClient.delete(`/roles/${roleId}`)
  } catch {
    deleteDemoRole(roleId)
  }
}

export const toggleRoleStatusApi = async (
  roleId: string,
  status: ActivationStatus
): Promise<Role> => {
  try {
    const { data } = await httpClient.patch(`/roles/${roleId}`, { status })
    return data.data
  } catch {
    const found = getDemoRoles().find((r) => r.id === roleId)
    return found ? { ...found, status } : getDemoRoles()[0]!
  }
}

export const getRoleApi = async (roleId: string): Promise<Role> => {
  try {
    const { data } = await httpClient.get(`/roles/${roleId}`)
    return data.data
  } catch {
    return getDemoRoles().find((r) => r.id === roleId) || getDemoRoles()[0]!
  }
}

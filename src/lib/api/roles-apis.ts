import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
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
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch roles")
    console.error("[API Error] fetchRolesListApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
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
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to create role")
    console.error("[API Error] createRoleApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return addDemoRole(payload)
    }
    throw error
  }
}

export const updateRoleApi = async (
  roleId: string,
  payload: UpdateRolePayload
): Promise<Role> => {
  try {
    const { data } = await httpClient.patch(`/roles/${roleId}`, payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to update role ${roleId}`)
    console.error("[API Error] updateRoleApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoRoles().find((r) => r.id === roleId)
      if (!found) throw new Error(`Role with ID ${roleId} not found: ${message}`)
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
    throw error
  }
}

export const deleteRoleApi = async (roleId: string): Promise<void> => {
  try {
    await httpClient.delete(`/roles/${roleId}`)
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to delete role ${roleId}`)
    console.error("[API Error] deleteRoleApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      deleteDemoRole(roleId)
      return
    }
    throw error
  }
}

export const toggleRoleStatusApi = async (
  roleId: string,
  status: ActivationStatus
): Promise<Role> => {
  try {
    const { data } = await httpClient.patch(`/roles/${roleId}`, { status })
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to toggle status for role ${roleId}`)
    console.error("[API Error] toggleRoleStatusApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoRoles().find((r) => r.id === roleId)
      if (!found) throw new Error(`Role with ID ${roleId} not found: ${message}`)
      return { ...found, status }
    }
    throw error
  }
}

export const getRoleApi = async (roleId: string): Promise<Role> => {
  try {
    const { data } = await httpClient.get(`/roles/${roleId}`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Role ${roleId} not found`)
    console.error("[API Error] getRoleApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoRoles().find((r) => r.id === roleId)
      if (found) return found
      throw new Error(`Role with ID ${roleId} not found: ${message}`)
    }
    throw error
  }
}

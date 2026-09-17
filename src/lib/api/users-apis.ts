import { User, UserRole, UserStatus, UserType, RoleSummary } from "@/types/users"
import apiClient from "@/lib/myapi/client"
import { ApiPaginatedResponse, ServerTableParams } from "../../types/tables"
import {
  getDemoUsers,
  addDemoUser,
  updateDemoUser,
  deleteDemoUser,
  paginateDemoList,
} from "@/lib/demo-data"

/**
 * Shape of user records as returned by backend microservices or raw payloads.
 */
export interface RawBackendUser {
  id: string
  name: string
  email: string
  role?: string
  userType?: UserType
  status?: UserStatus
  isActive?: boolean
  isVerified?: boolean
  isBanned?: boolean
  orgId?: string
  createdAt?: string
  updatedAt?: string
  profileColor?: string
  avatar?: string | null
  roles?: RoleSummary[]
  [key: string]: unknown
}

/**
 * Normalizes a raw user payload from either a microservice backend or demo fixtures
 * into the strict {@link User} domain model. Resolves user roles to UserType enums,
 * sets active/banned status defaults, and assigns profile colors and avatar paths.
 *
 * @param u - Raw user object from server or demo store
 * @returns Fully typed and normalized User entity
 */
function mapUser(u: RawBackendUser): User {
  let userType = u.userType
  if (!userType) {
    userType =
      u.role === "admin"
        ? UserType.ADMIN
        : u.role === "staff"
        ? UserType.STAFF
        : UserType.USER
  }
  let status = u.status
  if (!status) {
    status = u.isBanned
      ? UserStatus.BANNED
      : u.isActive === false
      ? UserStatus.INACTIVE
      : UserStatus.ACTIVE
  }

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role as UserRole,
    userType,
    status,
    isActive: u.isActive ?? !u.isBanned,
    isVerified: u.isVerified ?? false,
    isBanned: u.isBanned ?? status === UserStatus.BANNED,
    orgId: u.orgId,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    profileColor: u.profileColor || "#0f62fe",
    avatar: u.avatar || undefined,
    roles: u.roles || [],
  }
}

/**
 * Retrieves a paginated list of users matching query parameters.
 * Implements the Dual-Mode Resiliency Pattern: attempts to fetch live records
 * from `/users` via the backend proxy, falling back to the in-memory demo engine
 * upon network disconnect or HTTP failure.
 *
 * @param params - Server table parameters including page, limit, search, and filters
 * @returns Standardized paginated response containing normalized User records
 */
export const fetchUsersApi = async (
  params: Partial<ServerTableParams> = {}
): Promise<ApiPaginatedResponse<User>> => {
  try {
    const { data } = await apiClient.get("/users")
    const rawList: RawBackendUser[] = Array.isArray(data)
      ? (data as RawBackendUser[])
      : ((data as { data?: RawBackendUser[] })?.data || [])
    if (rawList.length > 0) {
      const mappedList = rawList.map(mapUser)
      return paginateDemoList(
        mappedList,
        params,
        (u, search) =>
          (u.name?.toLowerCase().includes(search) ?? false) ||
          (u.email?.toLowerCase().includes(search) ?? false)
      )
    }
  } catch {
    // Fallback to demo users
  }

  return paginateDemoList(
    getDemoUsers(),
    params,
    (u, search) =>
      (u.name?.toLowerCase().includes(search) ?? false) ||
      (u.email?.toLowerCase().includes(search) ?? false)
  )
}

export const toggleStatusUserApi = async (
  id: string,
  isActive?: boolean
): Promise<User> => {
  try {
    const { data } = await apiClient.patch(
      `/users/${id}/status`,
      isActive !== undefined ? { isActive } : {}
    )
    return mapUser(data)
  } catch {
    return updateDemoUser(id, { isActive: isActive ?? true })
  }
}

export const toggleBanUserApi = async (
  id: string,
  isBanned?: boolean
): Promise<User> => {
  try {
    return await toggleStatusUserApi(id, isBanned !== undefined ? !isBanned : undefined)
  } catch {
    return updateDemoUser(id, {
      status: isBanned ? UserStatus.BANNED : UserStatus.ACTIVE,
      isActive: !isBanned,
    })
  }
}

export const activateUserApi = async (
  id: string,
  isActive?: boolean
): Promise<User> => {
  return toggleStatusUserApi(id, isActive)
}

export const deleteUserApi = async (id: string): Promise<void> => {
  try {
    await apiClient.delete(`/users/${id}`)
  } catch {
    deleteDemoUser(id)
  }
}

export const createUserApi = async (input: {
  name: string
  email: string
  role?: string
}): Promise<User> => {
  try {
    const { data } = await apiClient.post("/users", input)
    return mapUser(data)
  } catch {
    return addDemoUser({
      name: input.name,
      email: input.email,
      role: (input.role as UserRole) || "user",
    })
  }
}

export const getUserApi = async (id: string): Promise<User> => {
  try {
    const { data } = await apiClient.get(`/users/${id}`)
    return mapUser(data)
  } catch {
    const found = getDemoUsers().find((u) => u.id === id)
    return found || getDemoUsers()[0]!
  }
}

export const updateUserApi = async (
  id: string,
  input: Partial<User>
): Promise<User> => {
  try {
    const { data } = await apiClient.patch(`/users/${id}`, input)
    return mapUser(data)
  } catch {
    return updateDemoUser(id, input)
  }
}

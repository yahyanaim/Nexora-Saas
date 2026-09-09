import { User, UserStatus } from "@/types/users"
import httpClient from "./http-client"
import { ApiPaginatedResponse, ServerTableParams } from "../../types/tables"
import { UserFormValues } from "@/hooks/users/user-form-schema"

export const fetchUsersApi = async ({
  page = 0,
  pageSize = 10,
  filter,
  search,
  sortBy,
  sortOrder,
  defaultFilters = [],
}: ServerTableParams): Promise<ApiPaginatedResponse<User>> => {
  const mergedFilters = [...defaultFilters, ...(filter || [])]

  const { data } = await httpClient.get("/users", {
    params: {
      page,
      pageSize,
      ...(mergedFilters?.length && { filter: JSON.stringify(mergedFilters) }),
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

export const toggleBanUserApi = async (id: string, ban?: boolean) => {
  const { data } = await httpClient.patch(`/users/${id}`, {
    status: ban ? UserStatus.BANNED : UserStatus.ACTIVE,
  })
  return data
}

export const activateUserApi = async (id: string) => {
  const { data } = await httpClient.patch(`/users/${id}/activate`)
  return data
}

export const deleteUserApi = async (id: string) => {
  const { data } = await httpClient.delete(`/users/${id}`)
  return data
}

export const createUserApi = async (input: UserFormValues): Promise<User> => {
  const { data } = await httpClient.post("/users", input)
  return data.data
}

export const updateUserApi = async (
  id: string,
  input: Partial<UserFormValues>
): Promise<User> => {
  const { data } = await httpClient.patch(`/users/${id}`, {
    name: input?.name || undefined,
    username: input?.username || undefined,
    email: input?.email || undefined,
    userType: input?.userType || undefined,
    roles: input?.roles ?? [],
    status: input?.status || undefined,
    is2FA: input?.is2FA || undefined,
    bio: input?.bio || undefined,
  })
  return data.data
}

export const getUserApi = async (id: string): Promise<User> => {
  const { data } = await httpClient.get(`/users/${id}`)
  return data.data
}

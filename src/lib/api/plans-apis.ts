import httpClient from "./http-client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type { Plan, CreatePlanPayload, UpdatePlanPayload } from "@/types/plans"

export const fetchPlansApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Plan>> => {
  const { data } = await httpClient.get("/plans", {
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

export const getPlanApi = async (planId: string): Promise<Plan> => {
  const { data } = await httpClient.get(`/plans/${planId}`)
  return data.data
}

export const createPlanApi = async (
  payload: CreatePlanPayload
): Promise<Plan> => {
  const { data } = await httpClient.post("/plans", payload)
  return data.data
}

export const updatePlanApi = async (
  planId: string,
  payload: UpdatePlanPayload
): Promise<Plan> => {
  const { data } = await httpClient.patch(`/plans/${planId}`, payload)
  return data.data
}

export const deletePlanApi = async (planId: string): Promise<void> => {
  const { data } = await httpClient.delete(`/plans/${planId}`)
  return data
}

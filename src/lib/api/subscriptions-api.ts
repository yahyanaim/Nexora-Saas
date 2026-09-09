import httpClient from "./http-client"
import type { ApiPaginatedResponse, ServerTableParams } from "@/types/tables"
import type {
  Subscription,
  CreateSubscriptionPayload,
  UpdateSubscriptionPayload,
  SubscriptionsSummary,
} from "@/types/subscriptions"

export const fetchSubscriptionsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Subscription>> => {
  const { data } = await httpClient.get("/subscriptions", {
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
    success: data?.success ?? true,
    data: data?.data || [],
    pagination: {
      page: data?.pagination?.page || 0,
      pageSize: data?.pagination?.pageSize || 0,
      totalItems: data?.pagination?.totalItems || data?.pagination?.total || 0,
      totalPages: data?.pagination?.totalPages || 0,
      hasNextPage: data?.pagination?.hasNextPage || false,
      hasPrevPage: data?.pagination?.hasPrevPage || false,
    },
  }
}

export const fetchSubscriptionsSummaryApi =
  async (): Promise<SubscriptionsSummary> => {
    const { data } = await httpClient.get("/subscriptions/summary")
    return data?.data
  }

export const getSubscriptionApi = async (id: string): Promise<Subscription> => {
  const { data } = await httpClient.get(`/subscriptions/${id}`)
  return data?.data
}

export const createSubscriptionApi = async (
  payload: CreateSubscriptionPayload
): Promise<Subscription> => {
  const { data } = await httpClient.post("/subscriptions", payload)
  return data?.data
}

export const updateSubscriptionApi = async (
  id: string,
  payload: UpdateSubscriptionPayload
): Promise<Subscription> => {
  const { data } = await httpClient.patch(`/subscriptions/${id}`, payload)
  return data?.data
}

export const deleteSubscriptionApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/subscriptions/${id}`)
  return data?.data
}

export const cancelSubscriptionApi = async (
  id: string
): Promise<Subscription> => {
  const { data } = await httpClient.post(`/subscriptions/${id}/cancel`)
  return data?.data
}

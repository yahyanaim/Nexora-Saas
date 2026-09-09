// lib/api/transactions-api.ts

import httpClient from "./http-client"
import type {
  ApiPaginatedResponse,
  PaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import type {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionsSummary,
} from "@/types/transactions"

export const fetchTransactionsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Transaction>> => {
  const { data } = await httpClient.get("/transactions", {
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

export const getTransactionApi = async (id: string): Promise<Transaction> => {
  const { data } = await httpClient.get(`/transactions/${id}`)
  return data.data
}

export const createTransactionApi = async (
  payload: CreateTransactionPayload
): Promise<Transaction> => {
  const { data } = await httpClient.post("/transactions", payload)
  return data.data
}

export const updateTransactionApi = async (
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> => {
  const { data } = await httpClient.patch(`/transactions/${id}`, payload)
  return data.data
}

export const deleteTransactionApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/transactions/${id}`)
  return data
}

export const refundTransactionApi = async (
  id: string
): Promise<Transaction> => {
  const { data } = await httpClient.post(`/transactions/${id}/refund`)
  return data.data
}

export const fetchTransactionsSummaryApi =
  async (): Promise<TransactionsSummary> => {
    const { data } = await httpClient.get("/transactions/summary")
    return data.data
  }

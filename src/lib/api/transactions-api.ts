// lib/api/transactions-api.ts

import httpClient from "@/lib/myapi/client"
import type {
  ApiPaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import type {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionsSummary,
} from "@/types/transactions"
import {
  getDemoTransactions,
  getDemoTransactionsSummary,
  paginateDemoList,
} from "@/lib/demo-data"

export const fetchTransactionsApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Transaction>> => {
  try {
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
    // Fallback to demo transactions
  }

  return paginateDemoList(
    getDemoTransactions(),
    params,
    (tx, search) =>
      tx.transactionId.toLowerCase().includes(search) ||
      tx.user.name.toLowerCase().includes(search) ||
      (tx.description || "").toLowerCase().includes(search) ||
      (tx.reference || "").toLowerCase().includes(search)
  )
}

export const getTransactionApi = async (id: string): Promise<Transaction> => {
  try {
    const { data } = await httpClient.get(`/transactions/${id}`)
    return data.data
  } catch {
    return getDemoTransactions().find((t) => t.id === id) || getDemoTransactions()[0]!
  }
}

export const createTransactionApi = async (
  payload: CreateTransactionPayload
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.post("/transactions", payload)
    return data.data
  } catch {
    return getDemoTransactions()[0]!
  }
}

export const updateTransactionApi = async (
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.patch(`/transactions/${id}`, payload)
    return data.data
  } catch {
    return getDemoTransactions()[0]!
  }
}

export const deleteTransactionApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/transactions/${id}`)
  } catch {
    // Demo deletion ok
  }
}

export const refundTransactionApi = async (
  id: string
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.post(`/transactions/${id}/refund`)
    return data.data
  } catch {
    return getDemoTransactions()[0]!
  }
}

export const fetchTransactionsSummaryApi =
  async (): Promise<TransactionsSummary> => {
    try {
      const { data } = await httpClient.get("/transactions/summary")
      if (data?.data) return data.data
    } catch {
      // Fallback to demo summary
    }
    return getDemoTransactionsSummary()
  }

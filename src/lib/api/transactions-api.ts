// lib/api/transactions-api.ts

import httpClient, { apiErrorMessage, isBackendUnreachable } from "@/lib/myapi/client"
import type {
  ApiPaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import {
  Transaction,
  CreateTransactionPayload,
  UpdateTransactionPayload,
  TransactionsSummary,
  TransactionStatus,
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
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to fetch transactions")
    console.error("[API Error] fetchTransactionsApi failed:", message, error)
    if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
      throw error
    }
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
  } catch (error) {
    const message = apiErrorMessage(error, `Transaction ${id} not found`)
    console.error("[API Error] getTransactionApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoTransactions().find((t) => t.id === id)
      if (found) return found
      throw new Error(`Transaction with ID ${id} not found: ${message}`)
    }
    throw error
  }
}

export const createTransactionApi = async (
  payload: CreateTransactionPayload
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.post("/transactions", payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, "Failed to create transaction")
    console.error("[API Error] createTransactionApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const demoTx: Transaction = {
        id: `tx-demo-${Date.now()}`,
        transactionId: `TX-${Math.floor(100000 + Math.random() * 900000)}`,
        user: { id: "usr-demo", name: "Demo User", email: "demo@example.com" },
        amount: payload.amount,
        status: payload.status ?? TransactionStatus.PAID,
        method: payload.method,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        description: payload.description,
        reference: payload.reference,
      }
      return demoTx
    }
    throw error
  }
}

export const updateTransactionApi = async (
  id: string,
  payload: UpdateTransactionPayload
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.patch(`/transactions/${id}`, payload)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to update transaction ${id}`)
    console.error("[API Error] updateTransactionApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoTransactions().find((t) => t.id === id)
      if (!found) throw new Error(`Transaction with ID ${id} not found: ${message}`)
      return { ...found, ...payload }
    }
    throw error
  }
}

export const deleteTransactionApi = async (id: string): Promise<void> => {
  try {
    await httpClient.delete(`/transactions/${id}`)
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to delete transaction ${id}`)
    console.error("[API Error] deleteTransactionApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      return
    }
    throw error
  }
}

export const refundTransactionApi = async (
  id: string
): Promise<Transaction> => {
  try {
    const { data } = await httpClient.post(`/transactions/${id}/refund`)
    return data.data
  } catch (error) {
    const message = apiErrorMessage(error, `Failed to refund transaction ${id}`)
    console.error("[API Error] refundTransactionApi failed:", message, error)
    if (isBackendUnreachable(error) && process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
      const found = getDemoTransactions().find((t) => t.id === id)
      if (!found) throw new Error(`Transaction with ID ${id} not found: ${message}`)
      return { ...found, status: "refunded" as Transaction["status"] }
    }
    throw error
  }
}

export const fetchTransactionsSummaryApi =
  async (): Promise<TransactionsSummary> => {
    try {
      const { data } = await httpClient.get("/transactions/summary")
      if (data?.data) return data.data
    } catch (error) {
      const message = apiErrorMessage(error, "Failed to fetch transactions summary")
      console.error("[API Error] fetchTransactionsSummaryApi failed:", message, error)
      if (!isBackendUnreachable(error) || process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
        throw error
      }
    }
    return getDemoTransactionsSummary()
  }

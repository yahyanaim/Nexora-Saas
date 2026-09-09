// lib/api/invoices-api.ts

import httpClient from "./http-client"
import type {
  ApiPaginatedResponse,
  PaginatedResponse,
  ServerTableParams,
} from "@/types/tables"
import type {
  Invoice,
  CreateInvoicePayload,
  UpdateInvoicePayload,
  InvoicesSummary,
} from "@/types/invoices"

export const fetchInvoicesApi = async (
  params: ServerTableParams
): Promise<ApiPaginatedResponse<Invoice>> => {
  const { data } = await httpClient.get("/invoices", {
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

export const getInvoiceApi = async (id: string): Promise<Invoice> => {
  const { data } = await httpClient.get(`/invoices/${id}`)
  return data.data
}

export const createInvoiceApi = async (
  payload: CreateInvoicePayload
): Promise<Invoice> => {
  const { data } = await httpClient.post("/invoices", payload)
  return data.data
}

export const updateInvoiceApi = async (
  id: string,
  payload: UpdateInvoicePayload
): Promise<Invoice> => {
  const { data } = await httpClient.patch(`/invoices/${id}`, payload)
  return data.data
}

export const deleteInvoiceApi = async (id: string): Promise<void> => {
  const { data } = await httpClient.delete(`/invoices/${id}`)
  return data
}

export const sendInvoiceApi = async (id: string): Promise<any> => {
  const { data } = await httpClient.post(`/invoices/${id}/send`)
  return data
}

export const downloadInvoiceApi = async (id: string): Promise<any> => {
  const { data } = await httpClient.get(`/invoices/${id}/download`)
  return data
}

export const markAsPaidApi = async (id: string): Promise<Invoice> => {
  const { data } = await httpClient.post(`/invoices/${id}/mark-paid`)
  return data.data
}

export const fetchInvoicesSummaryApi = async (): Promise<InvoicesSummary> => {
  const { data } = await httpClient.get("/invoices/summary")
  return data.data
}
